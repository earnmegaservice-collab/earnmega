-- ============================================================================
-- Migration: 20261118000000_pillar3_ai_paywall_and_isolation.sql
-- Pillar 3 (Earnmega AI Studio) Multi-Tier Timers, Pass Ledger & Strict 3-Pillar Isolation
-- ============================================================================

-- 1. Add Pillar 3 Subscription & Timer Columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_paid_pillar3 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pillar3_tier TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS pillar3_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pillar3_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pillar3_paystack_ref TEXT;

-- Backfill NULLs before enforcing NOT NULL constraints
UPDATE public.profiles
SET
  has_paid_pillar3 = COALESCE(has_paid_pillar3, FALSE),
  pillar3_tier = COALESCE(NULLIF(TRIM(pillar3_tier), ''), 'none')
WHERE has_paid_pillar3 IS NULL OR pillar3_tier IS NULL OR TRIM(pillar3_tier) = '';

-- 2. Keep Existing Grandfathered Users Active (While Enforcing Strict FALSE Default for New Users)
UPDATE public.profiles
SET
  pillar3_tier = 'premium',
  pillar3_started_at = COALESCE(pillar3_started_at, NOW()),
  pillar3_expires_at = COALESCE(pillar3_expires_at, NOW() + INTERVAL '365 days')
WHERE has_paid_pillar3 = TRUE
  AND pillar3_expires_at IS NULL;

-- Ensure any account with has_paid_pillar3 = FALSE has pillar3_tier = 'none'
UPDATE public.profiles
SET pillar3_tier = 'none'
WHERE has_paid_pillar3 = FALSE
  AND pillar3_tier <> 'none';

-- Enforce strict defaults and NOT NULL for all newly created accounts
ALTER TABLE public.profiles
  ALTER COLUMN has_paid_pillar3 SET DEFAULT FALSE,
  ALTER COLUMN has_paid_pillar3 SET NOT NULL,
  ALTER COLUMN pillar3_tier SET DEFAULT 'none',
  ALTER COLUMN pillar3_tier SET NOT NULL;

-- 3. Create / Upgrade Table public.pillar3_passes (Audit & Claim Ledger)
CREATE TABLE IF NOT EXISTS public.pillar3_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_reference TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  user_id UUID,
  plan_tier TEXT NOT NULL DEFAULT 'pro',
  amount_ghs NUMERIC(10,2) NOT NULL DEFAULT 100.00,
  duration_days INTEGER NOT NULL DEFAULT 30,
  claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all required columns exist if table was created by an earlier migration
ALTER TABLE public.pillar3_passes
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS claimed BOOLEAN DEFAULT FALSE;

-- Migrate any legacy claimed_by_user_id values into user_id & claimed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pillar3_passes'
      AND column_name = 'claimed_by_user_id'
  ) THEN
    EXECUTE '
      UPDATE public.pillar3_passes
      SET
        user_id = COALESCE(user_id, claimed_by_user_id),
        claimed = COALESCE(claimed, (claimed_by_user_id IS NOT NULL))
      WHERE user_id IS NULL AND claimed_by_user_id IS NOT NULL
    ';
  END IF;
END $$;

UPDATE public.pillar3_passes
SET
  plan_tier = COALESCE(
    NULLIF(TRIM(plan_tier), ''),
    CASE
      WHEN amount_ghs >= 200 THEN 'premium'
      WHEN amount_ghs >= 100 THEN 'pro'
      ELSE 'weekly'
    END
  ),
  amount_ghs = COALESCE(amount_ghs, 50.00),
  duration_days = COALESCE(
    duration_days,
    CASE
      WHEN amount_ghs >= 200 THEN 365
      WHEN amount_ghs >= 100 THEN 30
      ELSE 7
    END
  ),
  claimed = COALESCE(claimed, FALSE);

ALTER TABLE public.pillar3_passes
  ALTER COLUMN plan_tier SET NOT NULL,
  ALTER COLUMN amount_ghs TYPE NUMERIC(10,2) USING ROUND(COALESCE(amount_ghs, 50.00)::numeric, 2),
  ALTER COLUMN amount_ghs SET NOT NULL,
  ALTER COLUMN duration_days SET NOT NULL,
  ALTER COLUMN claimed SET DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_pillar3_passes_email ON public.pillar3_passes(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_pillar3_passes_user_id ON public.pillar3_passes(user_id);

-- Enable RLS and Grants on public.pillar3_passes
ALTER TABLE public.pillar3_passes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.pillar3_passes TO authenticated, anon;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pillar3_passes' AND policyname = 'Allow read pillar3_passes') THEN
    CREATE POLICY "Allow read pillar3_passes" ON public.pillar3_passes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pillar3_passes' AND policyname = 'Allow insert pillar3_passes') THEN
    CREATE POLICY "Allow insert pillar3_passes" ON public.pillar3_passes FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pillar3_passes' AND policyname = 'Allow update pillar3_passes') THEN
    CREATE POLICY "Allow update pillar3_passes" ON public.pillar3_passes FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Atomic RPC for Activating / Stacking Pillar 3 Multi-Tier Passes
CREATE OR REPLACE FUNCTION public.activate_pillar3_pass_rpc(
  p_reference TEXT,
  p_email TEXT,
  p_user_id UUID DEFAULT NULL,
  p_plan_tier TEXT DEFAULT 'pro',
  p_amount_ghs NUMERIC DEFAULT 100.00,
  p_duration_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email TEXT := COALESCE(NULLIF(LOWER(TRIM(COALESCE(p_email, ''))), ''), 'ai@earnmega.com');
  v_tier TEXT := CASE
    WHEN LOWER(TRIM(COALESCE(p_plan_tier, ''))) IN ('weekly', 'pro', 'premium') THEN LOWER(TRIM(p_plan_tier))
    WHEN COALESCE(p_amount_ghs, 0) >= 200 THEN 'premium'
    WHEN COALESCE(p_amount_ghs, 0) >= 100 THEN 'pro'
    ELSE 'weekly'
  END;
  v_days INTEGER := CASE
    WHEN COALESCE(p_duration_days, 0) IN (7, 30, 365) THEN p_duration_days
    WHEN v_tier = 'premium' THEN 365
    WHEN v_tier = 'pro' THEN 30
    ELSE 7
  END;
  v_amount NUMERIC(10,2) := CASE
    WHEN COALESCE(p_amount_ghs, 0) > 0 THEN ROUND(p_amount_ghs::numeric, 2)
    WHEN v_tier = 'premium' THEN 200.00
    WHEN v_tier = 'pro' THEN 100.00
    ELSE 50.00
  END;
  v_now TIMESTAMPTZ := NOW();
  v_target_uid UUID := p_user_id;
  v_existing_pass public.pillar3_passes%ROWTYPE;
  v_prof public.profiles%ROWTYPE;
  v_base_expiry TIMESTAMPTZ;
  v_new_expiry TIMESTAMPTZ;
  v_final_tier TEXT;
BEGIN
  -- Resolve user_id by email if not explicitly provided
  IF v_target_uid IS NULL AND v_clean_email <> '' THEN
    SELECT id INTO v_target_uid
    FROM public.profiles
    WHERE LOWER(TRIM(COALESCE(email, ''))) = v_clean_email
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- Check if this Paystack reference was already recorded and claimed
  SELECT * INTO v_existing_pass
  FROM public.pillar3_passes
  WHERE paystack_reference = p_reference
  LIMIT 1;

  IF FOUND AND v_existing_pass.claimed = TRUE AND v_target_uid IS NOT NULL THEN
    -- Ensure user's profile reflects it without double-stacking the same reference
    SELECT * INTO v_prof FROM public.profiles WHERE id = v_target_uid;
    IF FOUND AND (v_prof.has_paid_pillar3 IS DISTINCT FROM TRUE OR v_prof.pillar3_expires_at IS NULL OR v_prof.pillar3_expires_at <= v_now) THEN
      UPDATE public.profiles
      SET
        has_paid_pillar3 = TRUE,
        pillar3_tier = v_tier,
        pillar3_started_at = COALESCE(pillar3_started_at, v_now),
        pillar3_expires_at = v_now + (v_days || ' days')::INTERVAL,
        pillar3_paystack_ref = p_reference,
        updated_at = v_now
      WHERE id = v_target_uid
      RETURNING * INTO v_prof;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'already_claimed', true,
      'reference', p_reference,
      'email', v_clean_email,
      'user_id', v_target_uid,
      'plan_tier', COALESCE(v_prof.pillar3_tier, v_tier),
      'amount_ghs', v_amount,
      'duration_days', v_days,
      'pillar3_started_at', COALESCE(v_prof.pillar3_started_at, v_now),
      'pillar3_expires_at', COALESCE(v_prof.pillar3_expires_at, v_now + (v_days || ' days')::INTERVAL)
    );
  END IF;

  -- Upsert pass into public.pillar3_passes
  INSERT INTO public.pillar3_passes (
    paystack_reference,
    email,
    user_id,
    plan_tier,
    amount_ghs,
    duration_days,
    claimed,
    created_at
  )
  VALUES (
    p_reference,
    v_clean_email,
    v_target_uid,
    v_tier,
    v_amount,
    v_days,
    (v_target_uid IS NOT NULL),
    v_now
  )
  ON CONFLICT (paystack_reference) DO UPDATE SET
    email = COALESCE(NULLIF(EXCLUDED.email, ''), public.pillar3_passes.email),
    user_id = COALESCE(EXCLUDED.user_id, public.pillar3_passes.user_id),
    plan_tier = EXCLUDED.plan_tier,
    amount_ghs = EXCLUDED.amount_ghs,
    duration_days = EXCLUDED.duration_days,
    claimed = (COALESCE(EXCLUDED.user_id, public.pillar3_passes.user_id) IS NOT NULL);

  -- If user profile exists, activate & time-stack Pillar 3 ONLY (strictly isolated from Pillar 1 & Pillar 2)
  IF v_target_uid IS NOT NULL THEN
    SELECT * INTO v_prof FROM public.profiles WHERE id = v_target_uid FOR UPDATE;
    IF FOUND THEN
      IF v_prof.has_paid_pillar3 = TRUE AND v_prof.pillar3_expires_at IS NOT NULL AND v_prof.pillar3_expires_at > v_now THEN
        v_base_expiry := v_prof.pillar3_expires_at;
      ELSE
        v_base_expiry := v_now;
      END IF;

      v_new_expiry := v_base_expiry + (v_days || ' days')::INTERVAL;

      -- Keep highest tier if extending an active higher tier, otherwise use newly purchased tier
      IF v_prof.has_paid_pillar3 = TRUE AND v_prof.pillar3_expires_at IS NOT NULL AND v_prof.pillar3_expires_at > v_now THEN
        v_final_tier := CASE
          WHEN v_tier = 'premium' OR v_prof.pillar3_tier = 'premium' THEN 'premium'
          WHEN v_tier = 'pro' OR v_prof.pillar3_tier = 'pro' THEN 'pro'
          ELSE 'weekly'
        END;
      ELSE
        v_final_tier := v_tier;
      END IF;

      UPDATE public.profiles
      SET
        has_paid_pillar3 = TRUE,
        pillar3_tier = v_final_tier,
        pillar3_started_at = CASE
          WHEN has_paid_pillar3 = TRUE AND pillar3_started_at IS NOT NULL AND pillar3_expires_at > v_now THEN pillar3_started_at
          ELSE v_now
        END,
        pillar3_expires_at = v_new_expiry,
        pillar3_paystack_ref = p_reference,
        updated_at = v_now
      WHERE id = v_target_uid
      RETURNING * INTO v_prof;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reference', p_reference,
    'email', v_clean_email,
    'user_id', v_target_uid,
    'plan_tier', COALESCE(v_final_tier, v_tier),
    'amount_ghs', v_amount,
    'duration_days', v_days,
    'pillar3_started_at', COALESCE(v_prof.pillar3_started_at, v_now),
    'pillar3_expires_at', COALESCE(v_prof.pillar3_expires_at, v_now + (v_days || ' days')::INTERVAL)
  );
END;
$$;

-- 5. Update claim_paid_passes_for_user_rpc to support multi-tier Pillar 3 passes & time-stacking
CREATE OR REPLACE FUNCTION public.claim_paid_passes_for_user_rpc(
  p_user_id UUID,
  p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email TEXT := NULLIF(LOWER(TRIM(COALESCE(p_email, ''))), '');
  v_p1_ref TEXT := NULL;
  v_p2_ref TEXT := NULL;
  v_p2_paid_at TIMESTAMPTZ := NULL;
  v_p3_pass RECORD;
  v_prof public.profiles%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_base_expiry TIMESTAMPTZ;
BEGIN
  IF v_clean_email IS NULL THEN
    SELECT LOWER(TRIM(COALESCE(email, pillar2_email, ''))) INTO v_clean_email
    FROM public.profiles
    WHERE id = p_user_id;
  END IF;

  IF v_clean_email IS NOT NULL AND v_clean_email <> '' THEN
    -- Pillar 1 pass check (Isolated to Pillar 1)
    SELECT paystack_reference INTO v_p1_ref
    FROM public.global_chat_passes
    WHERE LOWER(TRIM(COALESCE(email, ''))) = v_clean_email
       OR claimed_by_user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_p1_ref IS NOT NULL THEN
      UPDATE public.global_chat_passes
      SET claimed_by_user_id = p_user_id
      WHERE paystack_reference = v_p1_ref AND claimed_by_user_id IS NULL;

      UPDATE public.profiles
      SET
        has_paid_global_chat = TRUE,
        global_chat_paystack_ref = COALESCE(global_chat_paystack_ref, v_p1_ref),
        updated_at = v_now
      WHERE id = p_user_id AND has_paid_global_chat IS DISTINCT FROM TRUE;
    END IF;

    -- Pillar 2 pass check (Isolated to Pillar 2)
    SELECT paystack_reference, created_at INTO v_p2_ref, v_p2_paid_at
    FROM public.pillar2_passes
    WHERE LOWER(TRIM(COALESCE(email, ''))) = v_clean_email
       OR claimed_by_user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_p2_ref IS NULL THEN
      SELECT paystack_reference, created_at INTO v_p2_ref, v_p2_paid_at
      FROM public.pillar2_unlocked_courses
      WHERE LOWER(TRIM(COALESCE(buyer_email, ''))) = v_clean_email
         OR user_id = p_user_id
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;

    IF v_p2_ref IS NOT NULL THEN
      UPDATE public.pillar2_passes
      SET claimed_by_user_id = p_user_id
      WHERE paystack_reference = v_p2_ref AND claimed_by_user_id IS NULL;

      UPDATE public.pillar2_unlocked_courses
      SET user_id = p_user_id
      WHERE LOWER(TRIM(COALESCE(buyer_email, ''))) = v_clean_email AND user_id IS NULL;

      UPDATE public.profiles
      SET
        has_paid_pillar2 = TRUE,
        is_pillar2_paid = TRUE,
        pillar2_paid_at = COALESCE(pillar2_paid_at, v_p2_paid_at, v_now),
        pillar2_expires_at = COALESCE(pillar2_expires_at, COALESCE(v_p2_paid_at, v_now) + INTERVAL '365 days'),
        license_activated_at = COALESCE(license_activated_at, v_p2_paid_at, v_now),
        license_expires_at = COALESCE(license_expires_at, COALESCE(v_p2_paid_at, v_now) + INTERVAL '365 days'),
        pillar2_paystack_ref = COALESCE(pillar2_paystack_ref, v_p2_ref),
        updated_at = v_now
      WHERE id = p_user_id AND (has_paid_pillar2 IS DISTINCT FROM TRUE OR pillar2_expires_at IS NULL);
    END IF;

    -- Pillar 3 pass check (Isolated to Pillar 3 — claim any unclaimed passes for this email)
    FOR v_p3_pass IN
      SELECT *
      FROM public.pillar3_passes
      WHERE (LOWER(TRIM(COALESCE(email, ''))) = v_clean_email OR user_id = p_user_id)
        AND COALESCE(claimed, FALSE) = FALSE
      ORDER BY created_at ASC
    LOOP
      UPDATE public.pillar3_passes
      SET
        user_id = p_user_id,
        claimed = TRUE
      WHERE id = v_p3_pass.id;

      SELECT * INTO v_prof FROM public.profiles WHERE id = p_user_id;
      IF v_prof.has_paid_pillar3 = TRUE AND v_prof.pillar3_expires_at IS NOT NULL AND v_prof.pillar3_expires_at > v_now THEN
        v_base_expiry := v_prof.pillar3_expires_at;
      ELSE
        v_base_expiry := v_now;
      END IF;

      UPDATE public.profiles
      SET
        has_paid_pillar3 = TRUE,
        pillar3_tier = COALESCE(NULLIF(v_p3_pass.plan_tier, ''), 'pro'),
        pillar3_started_at = COALESCE(pillar3_started_at, v_now),
        pillar3_expires_at = v_base_expiry + (COALESCE(v_p3_pass.duration_days, 30) || ' days')::INTERVAL,
        pillar3_paystack_ref = v_p3_pass.paystack_reference,
        updated_at = v_now
      WHERE id = p_user_id;
    END LOOP;
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = p_user_id;
  RETURN to_jsonb(v_prof);
END;
$$;

-- 6. Update handle_horpal_auth_user_sync trigger function to strictly enforce FALSE & 'none' defaults unless pre-paid pass exists
CREATE OR REPLACE FUNCTION public.handle_horpal_auth_user_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider text;
  v_profile_completed boolean;
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_username text;
  v_phone text;
  v_country text;
  v_currency text;
  v_aff_code text;
  v_p1_ref text := NULL;
  v_p2_ref text := NULL;
  v_p2_paid_at timestamptz := NULL;
  v_p3_ref text := NULL;
  v_p3_tier text := 'none';
  v_p3_days integer := 0;
BEGIN
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', '');
  v_profile_completed := COALESCE((NEW.raw_user_meta_data->>'profile_completed')::boolean, false);
  v_aff_code := 'HP-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 6));

  IF NEW.email IS NOT NULL THEN
    SELECT paystack_reference INTO v_p1_ref
    FROM public.global_chat_passes
    WHERE LOWER(email) = LOWER(NEW.email)
    ORDER BY created_at DESC
    LIMIT 1;

    SELECT paystack_reference, created_at INTO v_p2_ref, v_p2_paid_at
    FROM public.pillar2_passes
    WHERE LOWER(email) = LOWER(NEW.email)
    ORDER BY created_at DESC
    LIMIT 1;

    SELECT paystack_reference, COALESCE(plan_tier, 'pro'), COALESCE(duration_days, 30)
    INTO v_p3_ref, v_p3_tier, v_p3_days
    FROM public.pillar3_passes
    WHERE LOWER(email) = LOWER(NEW.email)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_p3_ref IS NOT NULL THEN
      UPDATE public.pillar3_passes
      SET user_id = NEW.id, claimed = TRUE
      WHERE paystack_reference = v_p3_ref;
    ELSE
      v_p3_tier := 'none';
      v_p3_days := 0;
    END IF;
  END IF;

  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), '')
  );
  v_first_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''),
    NULLIF(SPLIT_PART(COALESCE(v_full_name, ''), ' ', 1), '')
  );
  v_last_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''),
    NULLIF(TRIM(SUBSTRING(COALESCE(v_full_name, '') FROM LENGTH(SPLIT_PART(COALESCE(v_full_name, ''), ' ', 1)) + 2)), '')
  );
  v_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'preferred_username'), ''),
    NULLIF(v_first_name, ''),
    SPLIT_PART(COALESCE(NEW.email, ''), '@', 1)
  );
  v_phone := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone_number'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '')
  );
  v_country := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'country'), ''),
    'Ghana'
  );
  v_currency := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'currency'), ''),
    'USD'
  );

  INSERT INTO public.profiles (
    id,
    email,
    username,
    full_name,
    first_name,
    last_name,
    phone_number,
    phone,
    country,
    location_country,
    currency,
    affiliate_code,
    pillar2_first_name,
    pillar2_last_name,
    pillar2_email,
    pillar2_phone,
    pillar2_country,
    has_paid_global_chat,
    global_chat_paystack_ref,
    has_paid_pillar2,
    is_pillar2_paid,
    pillar2_paid_at,
    pillar2_expires_at,
    license_activated_at,
    license_expires_at,
    pillar2_paystack_ref,
    has_paid_pillar3,
    pillar3_tier,
    pillar3_started_at,
    pillar3_expires_at,
    pillar3_paystack_ref,
    affiliate_balance,
    affiliate_total_earned,
    affiliate_withdrawn,
    affiliate_total_sales,
    affiliate_link_clicks,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN v_provider = 'google' AND NOT v_profile_completed THEN NULL ELSE v_username END,
    CASE WHEN v_provider = 'google' AND NOT v_profile_completed THEN NULL ELSE COALESCE(v_full_name, v_username) END,
    CASE WHEN v_provider = 'google' AND NOT v_profile_completed THEN NULL ELSE v_first_name END,
    CASE WHEN v_provider = 'google' AND NOT v_profile_completed THEN NULL ELSE v_last_name END,
    v_phone,
    v_phone,
    v_country,
    v_country,
    v_currency,
    v_aff_code,
    CASE WHEN v_provider = 'google' AND NOT v_profile_completed THEN NULL ELSE v_first_name END,
    CASE WHEN v_provider = 'google' AND NOT v_profile_completed THEN NULL ELSE v_last_name END,
    NEW.email,
    v_phone,
    v_country,
    (v_p1_ref IS NOT NULL),
    v_p1_ref,
    (v_p2_ref IS NOT NULL),
    (v_p2_ref IS NOT NULL),
    v_p2_paid_at,
    CASE WHEN v_p2_paid_at IS NOT NULL THEN v_p2_paid_at + INTERVAL '365 days' ELSE NULL END,
    v_p2_paid_at,
    CASE WHEN v_p2_paid_at IS NOT NULL THEN v_p2_paid_at + INTERVAL '365 days' ELSE NULL END,
    v_p2_ref,
    (v_p3_ref IS NOT NULL),
    CASE WHEN v_p3_ref IS NOT NULL THEN v_p3_tier ELSE 'none' END,
    CASE WHEN v_p3_ref IS NOT NULL THEN NOW() ELSE NULL END,
    CASE WHEN v_p3_ref IS NOT NULL THEN NOW() + (v_p3_days || ' days')::INTERVAL ELSE NULL END,
    v_p3_ref,
    0.00,
    0.00,
    0.00,
    0,
    0,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email),
    pillar2_email = COALESCE(NULLIF(public.profiles.pillar2_email, ''), EXCLUDED.pillar2_email),
    affiliate_code = COALESCE(NULLIF(public.profiles.affiliate_code, ''), EXCLUDED.affiliate_code),
    has_paid_global_chat = public.profiles.has_paid_global_chat OR EXCLUDED.has_paid_global_chat,
    global_chat_paystack_ref = COALESCE(public.profiles.global_chat_paystack_ref, EXCLUDED.global_chat_paystack_ref),
    has_paid_pillar2 = public.profiles.has_paid_pillar2 OR EXCLUDED.has_paid_pillar2,
    is_pillar2_paid = public.profiles.is_pillar2_paid OR EXCLUDED.is_pillar2_paid,
    pillar2_paid_at = COALESCE(public.profiles.pillar2_paid_at, EXCLUDED.pillar2_paid_at),
    pillar2_expires_at = COALESCE(public.profiles.pillar2_expires_at, EXCLUDED.pillar2_expires_at),
    license_activated_at = COALESCE(public.profiles.license_activated_at, EXCLUDED.license_activated_at),
    license_expires_at = COALESCE(public.profiles.license_expires_at, EXCLUDED.license_expires_at),
    pillar2_paystack_ref = COALESCE(public.profiles.pillar2_paystack_ref, EXCLUDED.pillar2_paystack_ref),
    has_paid_pillar3 = public.profiles.has_paid_pillar3 OR EXCLUDED.has_paid_pillar3,
    pillar3_tier = CASE
      WHEN public.profiles.has_paid_pillar3 AND public.profiles.pillar3_tier <> 'none' THEN public.profiles.pillar3_tier
      ELSE EXCLUDED.pillar3_tier
    END,
    pillar3_started_at = COALESCE(public.profiles.pillar3_started_at, EXCLUDED.pillar3_started_at),
    pillar3_expires_at = COALESCE(public.profiles.pillar3_expires_at, EXCLUDED.pillar3_expires_at),
    pillar3_paystack_ref = COALESCE(public.profiles.pillar3_paystack_ref, EXCLUDED.pillar3_paystack_ref),
    updated_at = now();

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_pillar3_pass_rpc(TEXT, TEXT, UUID, TEXT, NUMERIC, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_paid_passes_for_user_rpc(UUID, TEXT) TO anon, authenticated;

-- ============================================================================
-- Migration: 20261117000000_three_pillar_isolation_and_pillar2_real.sql
-- 3-Pillar Independent Access Architecture & Real Pillar 2 Financial Tracking
-- ============================================================================

-- 0. Ensure every existing auth.users row has a corresponding public.profiles row before grandfathering
INSERT INTO public.profiles (id, email, affiliate_code, updated_at)
SELECT
  u.id,
  u.email,
  'HP-' || UPPER(SUBSTRING(REPLACE(u.id::text, '-', '') FROM 1 FOR 6)),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- 1. Add Independent Pillar Access & Real Financial Columns to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_paid_global_chat BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_paid_pillar2 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pillar2_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pillar2_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pillar2_paystack_ref TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_code TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_balance NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS affiliate_total_earned NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS affiliate_withdrawn NUMERIC(12,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS affiliate_total_sales INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_link_clicks INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_paid_pillar3 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pillar3_paystack_ref TEXT;

-- Ensure affiliate_code is populated and unique
UPDATE public.profiles
SET affiliate_code = 'HP-' || UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 6))
WHERE affiliate_code IS NULL OR TRIM(affiliate_code) = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'u'
      AND conname = 'profiles_affiliate_code_key'
  ) THEN
    BEGIN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_affiliate_code_key UNIQUE (affiliate_code);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- Backfill NULL financial columns to 0.00 / 0 before enforcing NOT NULL
UPDATE public.profiles
SET
  affiliate_balance = COALESCE(affiliate_balance, 0.00),
  affiliate_total_earned = COALESCE(affiliate_total_earned, total_earnings_ghs, 0.00),
  affiliate_withdrawn = COALESCE(affiliate_withdrawn, total_withdrawn, 0.00),
  affiliate_total_sales = COALESCE(affiliate_total_sales, 0),
  affiliate_link_clicks = COALESCE(affiliate_link_clicks, 0);

-- 2. Grandfather All Existing Users Currently in the Database Across ALL 3 Pillars
UPDATE public.profiles
SET
  has_paid_global_chat = TRUE,
  has_paid_pillar2 = TRUE,
  pillar2_paid_at = COALESCE(pillar2_paid_at, NOW()),
  pillar2_expires_at = COALESCE(pillar2_expires_at, NOW() + INTERVAL '365 days'),
  pillar2_paystack_ref = COALESCE(pillar2_paystack_ref, 'EXISTING_USER_GRANDFATHERED_P2'),
  has_paid_pillar3 = TRUE,
  pillar3_paystack_ref = COALESCE(pillar3_paystack_ref, 'EXISTING_USER_GRANDFATHERED_P3'),
  affiliate_balance = COALESCE(affiliate_balance, 0.00),
  is_pillar2_paid = TRUE,
  license_activated_at = COALESCE(license_activated_at, pillar2_paid_at, NOW()),
  license_expires_at = COALESCE(license_expires_at, pillar2_expires_at, NOW() + INTERVAL '365 days'),
  global_chat_paystack_ref = COALESCE(global_chat_paystack_ref, 'EXISTING_USER_GRANDFATHERED_P1');

-- Enforce strict defaults (FALSE and 0.00) and NOT NULL constraints for all future users
ALTER TABLE public.profiles
  ALTER COLUMN has_paid_global_chat SET DEFAULT FALSE,
  ALTER COLUMN has_paid_pillar2 SET DEFAULT FALSE,
  ALTER COLUMN has_paid_pillar3 SET DEFAULT FALSE,
  ALTER COLUMN is_pillar2_paid SET DEFAULT FALSE,
  ALTER COLUMN affiliate_balance SET DEFAULT 0.00,
  ALTER COLUMN affiliate_balance SET NOT NULL,
  ALTER COLUMN affiliate_total_earned SET DEFAULT 0.00,
  ALTER COLUMN affiliate_total_earned SET NOT NULL,
  ALTER COLUMN affiliate_withdrawn SET DEFAULT 0.00,
  ALTER COLUMN affiliate_withdrawn SET NOT NULL,
  ALTER COLUMN affiliate_total_sales SET DEFAULT 0,
  ALTER COLUMN affiliate_total_sales SET NOT NULL,
  ALTER COLUMN affiliate_link_clicks SET DEFAULT 0,
  ALTER COLUMN affiliate_link_clicks SET NOT NULL;

-- 3. Create Real Pillar 2 Tracking Tables (Zero Fake Data)
CREATE TABLE IF NOT EXISTS public.pillar2_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_reference TEXT UNIQUE NOT NULL,
  product_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  gross_amount_ghs NUMERIC(12,2) NOT NULL,
  commission_amount_ghs NUMERIC(12,2) NOT NULL,
  affiliate_code TEXT,
  affiliate_user_id UUID,
  affiliate_email TEXT,
  affiliate_new_balance_ghs NUMERIC(12,2),
  buyer_user_id UUID,
  buyer_name TEXT,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pillar2_sales_affiliate_code ON public.pillar2_sales(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_pillar2_sales_affiliate_user_id ON public.pillar2_sales(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_pillar2_sales_buyer_email ON public.pillar2_sales(buyer_email);

CREATE TABLE IF NOT EXISTS public.pillar2_unlocked_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  buyer_email TEXT NOT NULL,
  product_id TEXT NOT NULL,
  paystack_reference TEXT NOT NULL,
  exam_passed BOOLEAN DEFAULT FALSE,
  certificate_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(buyer_email, product_id)
);

CREATE INDEX IF NOT EXISTS idx_pillar2_unlocked_courses_user_id ON public.pillar2_unlocked_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_pillar2_unlocked_courses_buyer_email ON public.pillar2_unlocked_courses(buyer_email);

CREATE TABLE IF NOT EXISTS public.pillar2_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_reference TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  amount_ghs NUMERIC DEFAULT 90,
  pass_type TEXT DEFAULT 'registration_1yr',
  claimed_by_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pillar2_passes_email ON public.pillar2_passes(LOWER(email));

CREATE TABLE IF NOT EXISTS public.pillar3_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_reference TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  amount_ghs NUMERIC DEFAULT 50,
  claimed_by_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pillar3_passes_email ON public.pillar3_passes(LOWER(email));

-- Enable RLS & Grants for Data API access
ALTER TABLE public.pillar2_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pillar2_unlocked_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pillar2_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pillar3_passes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.pillar2_sales TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.pillar2_unlocked_courses TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.pillar2_passes TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.pillar3_passes TO authenticated, anon;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pillar2_sales' AND policyname = 'Allow read pillar2_sales') THEN
    CREATE POLICY "Allow read pillar2_sales" ON public.pillar2_sales FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pillar2_sales' AND policyname = 'Allow insert pillar2_sales') THEN
    CREATE POLICY "Allow insert pillar2_sales" ON public.pillar2_sales FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pillar2_sales' AND policyname = 'Allow update pillar2_sales') THEN
    CREATE POLICY "Allow update pillar2_sales" ON public.pillar2_sales FOR UPDATE USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pillar2_unlocked_courses' AND policyname = 'Allow read pillar2_unlocked_courses') THEN
    CREATE POLICY "Allow read pillar2_unlocked_courses" ON public.pillar2_unlocked_courses FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pillar2_unlocked_courses' AND policyname = 'Allow insert pillar2_unlocked_courses') THEN
    CREATE POLICY "Allow insert pillar2_unlocked_courses" ON public.pillar2_unlocked_courses FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pillar2_unlocked_courses' AND policyname = 'Allow update pillar2_unlocked_courses') THEN
    CREATE POLICY "Allow update pillar2_unlocked_courses" ON public.pillar2_unlocked_courses FOR UPDATE USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pillar2_passes' AND policyname = 'Allow read pillar2_passes') THEN
    CREATE POLICY "Allow read pillar2_passes" ON public.pillar2_passes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pillar2_passes' AND policyname = 'Allow insert pillar2_passes') THEN
    CREATE POLICY "Allow insert pillar2_passes" ON public.pillar2_passes FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pillar2_passes' AND policyname = 'Allow update pillar2_passes') THEN
    CREATE POLICY "Allow update pillar2_passes" ON public.pillar2_passes FOR UPDATE USING (true) WITH CHECK (true);
  END IF;

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

-- 4. Ensure auth user sync trigger sets strict FALSE / 0.00 defaults for brand-new users (unless pre-paid pass exists for their email)
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
BEGIN
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', '');
  v_profile_completed := COALESCE((NEW.raw_user_meta_data->>'profile_completed')::boolean, false);
  v_aff_code := 'HP-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 6));

  -- Check if user pre-paid Pillar 1 pass with this email
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

    SELECT paystack_reference INTO v_p3_ref
    FROM public.pillar3_passes
    WHERE LOWER(email) = LOWER(NEW.email)
    ORDER BY created_at DESC
    LIMIT 1;
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
    pillar3_paystack_ref = COALESCE(public.profiles.pillar3_paystack_ref, EXCLUDED.pillar3_paystack_ref),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- 5. Atomic RPC Functions for 3-Pillar Independent Access & Pillar 2 License Renewal
CREATE OR REPLACE FUNCTION public.activate_pillar1_pass_rpc(
  p_reference TEXT,
  p_email TEXT,
  p_user_id UUID DEFAULT NULL,
  p_amount_ghs NUMERIC DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email TEXT := NULLIF(LOWER(TRIM(COALESCE(p_email, ''))), '');
BEGIN
  INSERT INTO public.global_chat_passes (paystack_reference, email, amount_ghs, claimed_by_user_id, created_at)
  VALUES (p_reference, v_clean_email, COALESCE(p_amount_ghs, 50), p_user_id, NOW())
  ON CONFLICT (paystack_reference) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.global_chat_passes.email),
    claimed_by_user_id = COALESCE(EXCLUDED.claimed_by_user_id, public.global_chat_passes.claimed_by_user_id);

  UPDATE public.profiles
  SET
    has_paid_global_chat = TRUE,
    global_chat_paystack_ref = p_reference,
    updated_at = NOW()
  WHERE (p_user_id IS NOT NULL AND id = p_user_id)
     OR (v_clean_email IS NOT NULL AND LOWER(TRIM(COALESCE(email, ''))) = v_clean_email);

  RETURN jsonb_build_object(
    'success', true,
    'reference', p_reference,
    'email', v_clean_email
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_pillar2_license_rpc(
  p_reference TEXT,
  p_email TEXT,
  p_user_id UUID DEFAULT NULL,
  p_amount_ghs NUMERIC DEFAULT 90,
  p_pass_type TEXT DEFAULT 'registration_1yr'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email TEXT := COALESCE(NULLIF(LOWER(TRIM(COALESCE(p_email, ''))), ''), 'partner@horpal.com');
  v_now TIMESTAMPTZ := NOW();
  v_expires TIMESTAMPTZ := NOW() + INTERVAL '365 days';
BEGIN
  INSERT INTO public.pillar2_passes (paystack_reference, email, amount_ghs, pass_type, claimed_by_user_id, created_at)
  VALUES (p_reference, v_clean_email, COALESCE(p_amount_ghs, 90), COALESCE(p_pass_type, 'registration_1yr'), p_user_id, v_now)
  ON CONFLICT (paystack_reference) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.pillar2_passes.email),
    claimed_by_user_id = COALESCE(EXCLUDED.claimed_by_user_id, public.pillar2_passes.claimed_by_user_id);

  UPDATE public.profiles
  SET
    has_paid_pillar2 = TRUE,
    is_pillar2_paid = TRUE,
    pillar2_paid_at = v_now,
    pillar2_expires_at = v_expires,
    license_activated_at = v_now,
    license_expires_at = v_expires,
    pillar2_paystack_ref = p_reference,
    updated_at = v_now
  WHERE (p_user_id IS NOT NULL AND id = p_user_id)
     OR LOWER(TRIM(COALESCE(email, ''))) = v_clean_email
     OR LOWER(TRIM(COALESCE(pillar2_email, ''))) = v_clean_email;

  RETURN jsonb_build_object(
    'success', true,
    'reference', p_reference,
    'email', v_clean_email,
    'pillar2_paid_at', v_now,
    'pillar2_expires_at', v_expires
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_pillar2_license_from_balance_rpc(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_current_bal NUMERIC(12,2);
  v_new_bal NUMERIC(12,2);
  v_now TIMESTAMPTZ := NOW();
  v_expires TIMESTAMPTZ := NOW() + INTERVAL '365 days';
  v_ref TEXT := 'BAL_REN_' || EXTRACT(EPOCH FROM v_now)::BIGINT || '_' || SUBSTRING(REPLACE(p_user_id::TEXT, '-', '') FROM 1 FOR 6);
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  v_current_bal := COALESCE(v_profile.affiliate_balance, 0.00);
  IF v_current_bal < 45.00 THEN
    RAISE EXCEPTION 'Insufficient affiliate balance (GH₵ %). You need at least GH₵ 45.00 to renew from balance.', v_current_bal;
  END IF;

  v_new_bal := ROUND(v_current_bal - 45.00, 2);

  UPDATE public.profiles
  SET
    affiliate_balance = v_new_bal,
    available_balance_ghs = GREATEST(0.00, ROUND(COALESCE(available_balance_ghs, v_current_bal) - 45.00, 2)),
    has_paid_pillar2 = TRUE,
    is_pillar2_paid = TRUE,
    pillar2_paid_at = v_now,
    pillar2_expires_at = v_expires,
    license_activated_at = v_now,
    license_expires_at = v_expires,
    pillar2_paystack_ref = v_ref,
    updated_at = v_now
  WHERE id = p_user_id;

  INSERT INTO public.pillar2_passes (paystack_reference, email, amount_ghs, pass_type, claimed_by_user_id, created_at)
  VALUES (
    v_ref,
    COALESCE(v_profile.email, v_profile.pillar2_email, 'partner@horpal.com'),
    45.00,
    'renewal_balance_1yr',
    p_user_id,
    v_now
  )
  ON CONFLICT (paystack_reference) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'reference', v_ref,
    'new_balance', v_new_bal,
    'pillar2_paid_at', v_now,
    'pillar2_expires_at', v_expires
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_pillar3_pass_rpc(
  p_reference TEXT,
  p_email TEXT,
  p_user_id UUID DEFAULT NULL,
  p_amount_ghs NUMERIC DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email TEXT := COALESCE(NULLIF(LOWER(TRIM(COALESCE(p_email, ''))), ''), 'ai@horpal.com');
BEGIN
  INSERT INTO public.pillar3_passes (paystack_reference, email, amount_ghs, claimed_by_user_id, created_at)
  VALUES (p_reference, v_clean_email, COALESCE(p_amount_ghs, 50), p_user_id, NOW())
  ON CONFLICT (paystack_reference) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.pillar3_passes.email),
    claimed_by_user_id = COALESCE(EXCLUDED.claimed_by_user_id, public.pillar3_passes.claimed_by_user_id);

  UPDATE public.profiles
  SET
    has_paid_pillar3 = TRUE,
    pillar3_paystack_ref = p_reference,
    updated_at = NOW()
  WHERE (p_user_id IS NOT NULL AND id = p_user_id)
     OR LOWER(TRIM(COALESCE(email, ''))) = v_clean_email;

  RETURN jsonb_build_object(
    'success', true,
    'reference', p_reference,
    'email', v_clean_email
  );
END;
$$;

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
  v_p3_ref TEXT := NULL;
  v_prof public.profiles%ROWTYPE;
BEGIN
  IF v_clean_email IS NULL THEN
    SELECT LOWER(TRIM(COALESCE(email, pillar2_email, ''))) INTO v_clean_email
    FROM public.profiles
    WHERE id = p_user_id;
  END IF;

  IF v_clean_email IS NOT NULL AND v_clean_email <> '' THEN
    -- Pillar 1 pass check
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
        updated_at = NOW()
      WHERE id = p_user_id AND has_paid_global_chat IS DISTINCT FROM TRUE;
    END IF;

    -- Pillar 2 pass or unlocked course check
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
        pillar2_paid_at = COALESCE(pillar2_paid_at, v_p2_paid_at, NOW()),
        pillar2_expires_at = COALESCE(pillar2_expires_at, COALESCE(v_p2_paid_at, NOW()) + INTERVAL '365 days'),
        license_activated_at = COALESCE(license_activated_at, v_p2_paid_at, NOW()),
        license_expires_at = COALESCE(license_expires_at, COALESCE(v_p2_paid_at, NOW()) + INTERVAL '365 days'),
        pillar2_paystack_ref = COALESCE(pillar2_paystack_ref, v_p2_ref),
        updated_at = NOW()
      WHERE id = p_user_id AND (has_paid_pillar2 IS DISTINCT FROM TRUE OR pillar2_expires_at IS NULL);
    END IF;

    -- Pillar 3 pass check
    SELECT paystack_reference INTO v_p3_ref
    FROM public.pillar3_passes
    WHERE LOWER(TRIM(COALESCE(email, ''))) = v_clean_email
       OR claimed_by_user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_p3_ref IS NOT NULL THEN
      UPDATE public.pillar3_passes
      SET claimed_by_user_id = p_user_id
      WHERE paystack_reference = v_p3_ref AND claimed_by_user_id IS NULL;

      UPDATE public.profiles
      SET
        has_paid_pillar3 = TRUE,
        pillar3_paystack_ref = COALESCE(pillar3_paystack_ref, v_p3_ref),
        updated_at = NOW()
      WHERE id = p_user_id AND has_paid_pillar3 IS DISTINCT FROM TRUE;
    END IF;
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = p_user_id;
  RETURN to_jsonb(v_prof);
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_pillar1_pass_rpc(TEXT, TEXT, UUID, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_pillar2_license_rpc(TEXT, TEXT, UUID, NUMERIC, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_pillar2_license_from_balance_rpc(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_pillar3_pass_rpc(TEXT, TEXT, UUID, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_paid_passes_for_user_rpc(UUID, TEXT) TO anon, authenticated;

-- 4F. Record Pillar 2 Sale, Credit Affiliate Balance, and Unlock Course + Pillar 2 for Buyer
CREATE OR REPLACE FUNCTION public.record_pillar2_sale_rpc(
  p_reference TEXT,
  p_product_id TEXT,
  p_product_title TEXT,
  p_gross_amount_ghs NUMERIC,
  p_commission_amount_ghs NUMERIC,
  p_affiliate_code TEXT DEFAULT NULL,
  p_buyer_user_id UUID DEFAULT NULL,
  p_buyer_name TEXT DEFAULT NULL,
  p_buyer_email TEXT DEFAULT NULL,
  p_buyer_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_sale RECORD;
  v_aff_profile RECORD;
  v_prev_aff_balance NUMERIC(12,2) := 0.00;
  v_new_aff_balance NUMERIC(12,2) := 0.00;
  v_clean_buyer_email TEXT;
  v_paid_at TIMESTAMPTZ := NOW();
  v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '365 days';
BEGIN
  IF p_reference IS NULL OR TRIM(p_reference) = '' OR UPPER(TRIM(p_reference)) LIKE 'HP_TEST_%' THEN
    RAISE EXCEPTION 'Invalid or test payment reference rejected: %', p_reference;
  END IF;

  v_clean_buyer_email := LOWER(TRIM(COALESCE(p_buyer_email, 'buyer@horpal.com')));

  SELECT * INTO v_existing_sale
  FROM public.pillar2_sales
  WHERE paystack_reference = p_reference
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'reference', p_reference,
      'affiliate_user_id', v_existing_sale.affiliate_user_id,
      'affiliate_email', v_existing_sale.affiliate_email,
      'affiliate_new_balance_ghs', COALESCE(v_existing_sale.affiliate_new_balance_ghs, 0.00)
    );
  END IF;

  IF p_affiliate_code IS NOT NULL AND TRIM(p_affiliate_code) <> '' AND UPPER(TRIM(p_affiliate_code)) <> 'DIRECT' THEN
    SELECT * INTO v_aff_profile
    FROM public.profiles
    WHERE UPPER(TRIM(COALESCE(affiliate_code, ''))) = UPPER(TRIM(p_affiliate_code))
       OR id::text = TRIM(p_affiliate_code)
       OR LOWER(SPLIT_PART(COALESCE(email, ''), '@', 1)) = LOWER(TRIM(p_affiliate_code))
    LIMIT 1;

    IF NOT FOUND THEN
      SELECT * INTO v_aff_profile
      FROM public.profiles
      WHERE UPPER(REGEXP_REPLACE(COALESCE(full_name, ''), '[^a-zA-Z0-9]', '', 'g')) LIKE (UPPER(REGEXP_REPLACE(p_affiliate_code, '[^a-zA-Z0-9]', '', 'g')) || '%')
      LIMIT 1;
    END IF;
  END IF;

  IF v_aff_profile.id IS NOT NULL AND COALESCE(p_commission_amount_ghs, 0) > 0 THEN
    v_prev_aff_balance := COALESCE(v_aff_profile.affiliate_balance, 0.00);

    UPDATE public.profiles
    SET
      affiliate_balance = COALESCE(affiliate_balance, 0.00) + p_commission_amount_ghs,
      available_balance_ghs = COALESCE(affiliate_balance, 0.00) + p_commission_amount_ghs,
      affiliate_total_earned = COALESCE(affiliate_total_earned, 0.00) + p_commission_amount_ghs,
      total_earnings_ghs = COALESCE(affiliate_total_earned, 0.00) + p_commission_amount_ghs,
      affiliate_total_sales = COALESCE(affiliate_total_sales, 0) + 1,
      affiliate_code = COALESCE(affiliate_code, UPPER(TRIM(p_affiliate_code)))
    WHERE id = v_aff_profile.id
    RETURNING affiliate_balance INTO v_new_aff_balance;
  END IF;

  INSERT INTO public.pillar2_sales (
    paystack_reference,
    product_id,
    product_title,
    gross_amount_ghs,
    commission_amount_ghs,
    affiliate_code,
    affiliate_user_id,
    affiliate_email,
    affiliate_new_balance_ghs,
    buyer_user_id,
    buyer_name,
    buyer_email,
    buyer_phone
  ) VALUES (
    p_reference,
    p_product_id,
    p_product_title,
    p_gross_amount_ghs,
    p_commission_amount_ghs,
    p_affiliate_code,
    v_aff_profile.id,
    v_aff_profile.email,
    v_new_aff_balance,
    p_buyer_user_id,
    p_buyer_name,
    v_clean_buyer_email,
    p_buyer_phone
  );

  INSERT INTO public.pillar2_unlocked_courses (
    user_id,
    buyer_email,
    product_id,
    paystack_reference,
    exam_passed
  ) VALUES (
    p_buyer_user_id,
    v_clean_buyer_email,
    p_product_id,
    p_reference,
    FALSE
  )
  ON CONFLICT (buyer_email, product_id) DO UPDATE SET
    user_id = COALESCE(EXCLUDED.user_id, public.pillar2_unlocked_courses.user_id),
    paystack_reference = EXCLUDED.paystack_reference;

  INSERT INTO public.pillar2_passes (paystack_reference, email, amount_ghs, pass_type, claimed_by_user_id)
  VALUES (p_reference, v_clean_buyer_email, p_gross_amount_ghs, 'course_purchase_1yr', p_buyer_user_id)
  ON CONFLICT (paystack_reference) DO NOTHING;

  UPDATE public.profiles
  SET
    has_paid_pillar2 = TRUE,
    is_pillar2_paid = TRUE,
    pillar2_paid_at = COALESCE(pillar2_paid_at, v_paid_at),
    pillar2_expires_at = GREATEST(COALESCE(pillar2_expires_at, v_paid_at), v_expires_at),
    license_activated_at = COALESCE(license_activated_at, v_paid_at),
    license_expires_at = GREATEST(COALESCE(license_expires_at, v_paid_at), v_expires_at),
    pillar2_paystack_ref = p_reference
  WHERE (p_buyer_user_id IS NOT NULL AND id = p_buyer_user_id)
     OR LOWER(TRIM(COALESCE(email, ''))) = v_clean_buyer_email;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'reference', p_reference,
    'affiliate_user_id', v_aff_profile.id,
    'affiliate_email', v_aff_profile.email,
    'affiliate_previous_balance_ghs', v_prev_aff_balance,
    'affiliate_new_balance_ghs', v_new_aff_balance,
    'pillar2_paid_at', v_paid_at,
    'pillar2_expires_at', v_expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_pillar2_sale_rpc(TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, UUID, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mark_pillar2_exam_passed_rpc(
  p_user_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_product_id TEXT DEFAULT NULL,
  p_certificate_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email TEXT;
  v_cert_id TEXT;
BEGIN
  v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));
  v_cert_id := COALESCE(NULLIF(TRIM(p_certificate_id), ''), 'HP-CERT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8)));

  UPDATE public.pillar2_unlocked_courses
  SET
    exam_passed = TRUE,
    certificate_id = COALESCE(certificate_id, v_cert_id),
    user_id = COALESCE(user_id, p_user_id)
  WHERE product_id = p_product_id
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id)
      OR (v_clean_email <> '' AND LOWER(TRIM(buyer_email)) = v_clean_email)
    )
  RETURNING certificate_id INTO v_cert_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course must be unlocked via verified purchase before claiming exam certificate.';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'exam_passed', true,
    'certificate_id', v_cert_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_pillar2_exam_passed_rpc(UUID, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.increment_pillar2_click_rpc(
  p_affiliate_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_clicks INTEGER := 0;
BEGIN
  IF p_affiliate_code IS NULL OR TRIM(p_affiliate_code) = '' THEN
    RETURN jsonb_build_object('success', false);
  END IF;

  UPDATE public.profiles
  SET affiliate_link_clicks = COALESCE(affiliate_link_clicks, 0) + 1
  WHERE UPPER(TRIM(COALESCE(affiliate_code, ''))) = UPPER(TRIM(p_affiliate_code))
     OR id::text = TRIM(p_affiliate_code)
  RETURNING affiliate_link_clicks INTO v_new_clicks;

  RETURN jsonb_build_object('success', FOUND, 'affiliate_link_clicks', COALESCE(v_new_clicks, 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_pillar2_click_rpc(TEXT) TO anon, authenticated, service_role;

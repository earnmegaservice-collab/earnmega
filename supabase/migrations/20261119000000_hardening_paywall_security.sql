-- ============================================================================
-- Paywall Hardening Migration (Phases 1, 3, 6 & Server Binding)
-- Fixes:
--   1. Enforce NOT NULL DEFAULT FALSE on all paid pillar booleans (preserving existing TRUE rows).
--   2. Block direct client INSERT/UPDATE of entitlement & balance columns on public.profiles.
--   3. Create atomic service-role-only bind_pillar_payment_rpc(p_pillar, ...).
--   4. Drop stale 4-arg activate_pillar3_pass_rpc overload & revoke client EXECUTE on all
--      payment mutation RPCs (service_role ONLY).
--   5. Harden claim_paid_passes_for_user_rpc & handle_horpal_auth_user_sync so new users
--      strictly default to FALSE on all 3 pillars and only unclaimed passes matching verified
--      auth.users.email can ever be claimed.
--   6. Remove public INSERT/UPDATE RLS policies on pass & sales ledgers.
-- ============================================================================

-- 1. Enforce strict FALSE defaults on public.profiles without disturbing grandfathered TRUE rows
UPDATE public.profiles
SET
  has_paid_global_chat = COALESCE(has_paid_global_chat, FALSE),
  has_paid_pillar2 = COALESCE(has_paid_pillar2, FALSE),
  is_pillar2_paid = COALESCE(is_pillar2_paid, FALSE),
  has_paid_pillar3 = COALESCE(has_paid_pillar3, FALSE)
WHERE
  has_paid_global_chat IS NULL
  OR has_paid_pillar2 IS NULL
  OR is_pillar2_paid IS NULL
  OR has_paid_pillar3 IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN has_paid_global_chat SET DEFAULT FALSE,
  ALTER COLUMN has_paid_global_chat SET NOT NULL,
  ALTER COLUMN has_paid_pillar2 SET DEFAULT FALSE,
  ALTER COLUMN has_paid_pillar2 SET NOT NULL,
  ALTER COLUMN is_pillar2_paid SET DEFAULT FALSE,
  ALTER COLUMN is_pillar2_paid SET NOT NULL,
  ALTER COLUMN has_paid_pillar3 SET DEFAULT FALSE,
  ALTER COLUMN has_paid_pillar3 SET NOT NULL;

-- 2. Trigger preventing anon/authenticated clients from forging entitlements or balances
CREATE OR REPLACE FUNCTION public.enforce_profiles_entitlement_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  -- SECURITY INVOKER trigger: direct client REST calls execute as 'anon' or 'authenticated',
  -- whereas SECURITY DEFINER RPCs run as 'postgres' and Next.js server routes run as 'service_role'.
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.has_paid_global_chat := FALSE;
      NEW.global_chat_paystack_ref := NULL;
      NEW.has_paid_pillar2 := FALSE;
      NEW.is_pillar2_paid := FALSE;
      NEW.pillar2_paid_at := NULL;
      NEW.pillar2_expires_at := NULL;
      NEW.license_activated_at := NULL;
      NEW.license_expires_at := NULL;
      NEW.pillar2_paystack_ref := NULL;
      NEW.has_paid_pillar3 := FALSE;
      NEW.pillar3_tier := 'none';
      NEW.pillar3_started_at := NULL;
      NEW.pillar3_expires_at := NULL;
      NEW.pillar3_paystack_ref := NULL;
      NEW.affiliate_balance := 0.00;
      NEW.available_balance_ghs := 0.00;
      NEW.affiliate_total_earned := 0.00;
      NEW.total_earnings_ghs := 0.00;
      NEW.affiliate_withdrawn := 0.00;
      NEW.total_withdrawn := 0.00;
      NEW.affiliate_total_sales := 0;
      NEW.subscription_tier := 'free';
      NEW.subscription_started_at := NULL;
      NEW.subscription_expires_at := NULL;
      NEW.is_banned := FALSE;
      NEW.is_wallet_frozen := FALSE;
      RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
      IF (
        NEW.has_paid_global_chat IS DISTINCT FROM OLD.has_paid_global_chat OR
        NEW.global_chat_paystack_ref IS DISTINCT FROM OLD.global_chat_paystack_ref OR
        NEW.has_paid_pillar2 IS DISTINCT FROM OLD.has_paid_pillar2 OR
        NEW.is_pillar2_paid IS DISTINCT FROM OLD.is_pillar2_paid OR
        NEW.pillar2_paid_at IS DISTINCT FROM OLD.pillar2_paid_at OR
        NEW.pillar2_expires_at IS DISTINCT FROM OLD.pillar2_expires_at OR
        NEW.license_activated_at IS DISTINCT FROM OLD.license_activated_at OR
        NEW.license_expires_at IS DISTINCT FROM OLD.license_expires_at OR
        NEW.pillar2_paystack_ref IS DISTINCT FROM OLD.pillar2_paystack_ref OR
        NEW.has_paid_pillar3 IS DISTINCT FROM OLD.has_paid_pillar3 OR
        NEW.pillar3_tier IS DISTINCT FROM OLD.pillar3_tier OR
        NEW.pillar3_started_at IS DISTINCT FROM OLD.pillar3_started_at OR
        NEW.pillar3_expires_at IS DISTINCT FROM OLD.pillar3_expires_at OR
        NEW.pillar3_paystack_ref IS DISTINCT FROM OLD.pillar3_paystack_ref OR
        NEW.affiliate_balance IS DISTINCT FROM OLD.affiliate_balance OR
        NEW.available_balance_ghs IS DISTINCT FROM OLD.available_balance_ghs OR
        NEW.affiliate_total_earned IS DISTINCT FROM OLD.affiliate_total_earned OR
        NEW.total_earnings_ghs IS DISTINCT FROM OLD.total_earnings_ghs OR
        NEW.affiliate_withdrawn IS DISTINCT FROM OLD.affiliate_withdrawn OR
        NEW.total_withdrawn IS DISTINCT FROM OLD.total_withdrawn OR
        NEW.affiliate_total_sales IS DISTINCT FROM OLD.affiliate_total_sales OR
        NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier OR
        NEW.subscription_started_at IS DISTINCT FROM OLD.subscription_started_at OR
        NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at OR
        NEW.is_banned IS DISTINCT FROM OLD.is_banned OR
        NEW.is_wallet_frozen IS DISTINCT FROM OLD.is_wallet_frozen
      ) THEN
        RAISE EXCEPTION 'Forbidden: protected entitlement or balance columns can only be updated by verified server handlers.' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_profiles_entitlement_integrity ON public.profiles;
CREATE TRIGGER trg_enforce_profiles_entitlement_integrity
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profiles_entitlement_integrity();

-- 3. Drop stale 4-arg Pillar 3 overload & create unified atomic bind_pillar_payment_rpc
DROP FUNCTION IF EXISTS public.activate_pillar3_pass_rpc(text, text, uuid, numeric);

CREATE OR REPLACE FUNCTION public.bind_pillar_payment_rpc(
  p_pillar integer,
  p_reference text,
  p_email text,
  p_user_id uuid DEFAULT NULL,
  p_amount_ghs numeric DEFAULT 50,
  p_tier text DEFAULT NULL,
  p_duration_days integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ref TEXT := NULLIF(TRIM(COALESCE(p_reference, '')), '');
  v_clean_email TEXT := NULLIF(LOWER(TRIM(COALESCE(p_email, ''))), '');
  v_now TIMESTAMPTZ := NOW();
  v_prof public.profiles%ROWTYPE;
  v_owner UUID;
  v_tier TEXT := NULL;
  v_days INTEGER := NULL;
  v_base TIMESTAMPTZ;
  v_expires TIMESTAMPTZ := NULL;
BEGIN
  IF v_ref IS NULL OR p_pillar NOT IN (1, 2, 3) THEN
    RAISE EXCEPTION 'Invalid pillar or reference';
  END IF;

  -- Enforce strict single-pillar isolation across all 3 ledgers
  IF p_pillar <> 1 AND EXISTS (SELECT 1 FROM public.global_chat_passes WHERE paystack_reference = v_ref) THEN
    RAISE EXCEPTION 'REFERENCE_USED_FOR_OTHER_PILLAR';
  END IF;
  IF p_pillar <> 2 AND EXISTS (SELECT 1 FROM public.pillar2_passes WHERE paystack_reference = v_ref) THEN
    RAISE EXCEPTION 'REFERENCE_USED_FOR_OTHER_PILLAR';
  END IF;
  IF p_pillar <> 3 AND EXISTS (SELECT 1 FROM public.pillar3_passes WHERE paystack_reference = v_ref) THEN
    RAISE EXCEPTION 'REFERENCE_USED_FOR_OTHER_PILLAR';
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT * INTO v_prof FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  END IF;

  IF p_pillar = 1 THEN
    SELECT claimed_by_user_id INTO v_owner
    FROM public.global_chat_passes
    WHERE paystack_reference = v_ref
    FOR UPDATE;

    IF FOUND AND v_owner IS NOT NULL AND (p_user_id IS NULL OR v_owner IS DISTINCT FROM p_user_id) THEN
      RAISE EXCEPTION 'REFERENCE_ALREADY_CLAIMED';
    END IF;

    INSERT INTO public.global_chat_passes (paystack_reference, email, amount_ghs, claimed_by_user_id, created_at)
    VALUES (v_ref, v_clean_email, COALESCE(p_amount_ghs, 50), p_user_id, v_now)
    ON CONFLICT (paystack_reference) DO UPDATE SET
      email = COALESCE(NULLIF(EXCLUDED.email, ''), public.global_chat_passes.email),
      claimed_by_user_id = COALESCE(public.global_chat_passes.claimed_by_user_id, EXCLUDED.claimed_by_user_id);

    IF p_user_id IS NOT NULL THEN
      UPDATE public.profiles
      SET
        has_paid_global_chat = TRUE,
        global_chat_paystack_ref = v_ref,
        updated_at = v_now
      WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'pillar', 1,
      'reference', v_ref,
      'email', v_clean_email,
      'bound', (p_user_id IS NOT NULL),
      'tier', NULL,
      'expires_at', NULL
    );
  END IF;

  IF p_pillar = 2 THEN
    v_days := COALESCE(NULLIF(p_duration_days, 0), 365);

    SELECT claimed_by_user_id INTO v_owner
    FROM public.pillar2_passes
    WHERE paystack_reference = v_ref
    FOR UPDATE;

    IF FOUND AND v_owner IS NOT NULL AND (p_user_id IS NULL OR v_owner IS DISTINCT FROM p_user_id) THEN
      RAISE EXCEPTION 'REFERENCE_ALREADY_CLAIMED';
    END IF;

    -- Idempotent re-verification check: do not infinitely stack 365 days on retry of the same receipt
    IF p_user_id IS NOT NULL AND v_owner = p_user_id
       AND v_prof.has_paid_pillar2 = TRUE
       AND v_prof.pillar2_paystack_ref = v_ref
       AND v_prof.pillar2_expires_at IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'pillar', 2,
        'reference', v_ref,
        'email', v_clean_email,
        'bound', true,
        'tier', NULL,
        'expires_at', v_prof.pillar2_expires_at
      );
    END IF;

    INSERT INTO public.pillar2_passes (paystack_reference, email, amount_ghs, pass_type, claimed_by_user_id, created_at)
    VALUES (
      v_ref,
      COALESCE(v_clean_email, 'partner@earnmega.com'),
      COALESCE(p_amount_ghs, 90),
      CASE WHEN COALESCE(p_amount_ghs, 90) < 90 THEN 'renewal_1yr' ELSE 'registration_1yr' END,
      p_user_id,
      v_now
    )
    ON CONFLICT (paystack_reference) DO UPDATE SET
      email = COALESCE(NULLIF(EXCLUDED.email, ''), public.pillar2_passes.email),
      claimed_by_user_id = COALESCE(public.pillar2_passes.claimed_by_user_id, EXCLUDED.claimed_by_user_id);

    IF p_user_id IS NOT NULL THEN
      IF v_prof.has_paid_pillar2 = TRUE AND v_prof.pillar2_expires_at IS NOT NULL AND v_prof.pillar2_expires_at > v_now THEN
        v_base := v_prof.pillar2_expires_at;
      ELSE
        v_base := v_now;
      END IF;
      v_expires := v_base + (v_days || ' days')::INTERVAL;

      UPDATE public.profiles
      SET
        has_paid_pillar2 = TRUE,
        is_pillar2_paid = TRUE,
        pillar2_paid_at = COALESCE(pillar2_paid_at, v_now),
        pillar2_expires_at = v_expires,
        license_activated_at = COALESCE(license_activated_at, v_now),
        license_expires_at = v_expires,
        pillar2_paystack_ref = v_ref,
        updated_at = v_now
      WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'pillar', 2,
      'reference', v_ref,
      'email', v_clean_email,
      'bound', (p_user_id IS NOT NULL),
      'tier', NULL,
      'expires_at', v_expires
    );
  END IF;

  -- Pillar 3
  v_tier := CASE
    WHEN LOWER(TRIM(COALESCE(p_tier, ''))) IN ('weekly', 'pro', 'premium') THEN LOWER(TRIM(p_tier))
    WHEN COALESCE(p_amount_ghs, 0) >= 200 THEN 'premium'
    WHEN COALESCE(p_amount_ghs, 0) >= 100 THEN 'pro'
    ELSE 'weekly'
  END;
  v_days := COALESCE(NULLIF(p_duration_days, 0), CASE v_tier WHEN 'premium' THEN 365 WHEN 'pro' THEN 30 ELSE 7 END);

  SELECT COALESCE(user_id, claimed_by_user_id) INTO v_owner
  FROM public.pillar3_passes
  WHERE paystack_reference = v_ref
  FOR UPDATE;

  IF FOUND AND v_owner IS NOT NULL AND (p_user_id IS NULL OR v_owner IS DISTINCT FROM p_user_id) THEN
    RAISE EXCEPTION 'REFERENCE_ALREADY_CLAIMED';
  END IF;

  IF p_user_id IS NOT NULL AND v_owner = p_user_id
     AND v_prof.has_paid_pillar3 = TRUE
     AND v_prof.pillar3_paystack_ref = v_ref
     AND v_prof.pillar3_expires_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'pillar', 3,
      'reference', v_ref,
      'email', v_clean_email,
      'bound', true,
      'tier', v_prof.pillar3_tier,
      'expires_at', v_prof.pillar3_expires_at
    );
  END IF;

  INSERT INTO public.pillar3_passes (
    paystack_reference, email, user_id, claimed_by_user_id, plan_tier, amount_ghs, duration_days, claimed, created_at
  )
  VALUES (
    v_ref,
    COALESCE(v_clean_email, 'ai@earnmega.com'),
    p_user_id,
    p_user_id,
    v_tier,
    COALESCE(p_amount_ghs, 50),
    v_days,
    (p_user_id IS NOT NULL),
    v_now
  )
  ON CONFLICT (paystack_reference) DO UPDATE SET
    email = COALESCE(NULLIF(EXCLUDED.email, ''), public.pillar3_passes.email),
    user_id = COALESCE(public.pillar3_passes.user_id, EXCLUDED.user_id),
    claimed_by_user_id = COALESCE(public.pillar3_passes.claimed_by_user_id, EXCLUDED.claimed_by_user_id),
    claimed = (COALESCE(public.pillar3_passes.user_id, public.pillar3_passes.claimed_by_user_id, EXCLUDED.user_id) IS NOT NULL);

  IF p_user_id IS NOT NULL THEN
    IF v_prof.has_paid_pillar3 = TRUE AND v_prof.pillar3_expires_at IS NOT NULL AND v_prof.pillar3_expires_at > v_now THEN
      v_base := v_prof.pillar3_expires_at;
    ELSE
      v_base := v_now;
    END IF;
    v_expires := v_base + (v_days || ' days')::INTERVAL;

    IF v_prof.has_paid_pillar3 = TRUE AND v_prof.pillar3_expires_at IS NOT NULL AND v_prof.pillar3_expires_at > v_now THEN
      v_tier := CASE
        WHEN v_tier = 'premium' OR v_prof.pillar3_tier = 'premium' THEN 'premium'
        WHEN v_tier = 'pro' OR v_prof.pillar3_tier = 'pro' THEN 'pro'
        ELSE 'weekly'
      END;
    END IF;

    UPDATE public.profiles
    SET
      has_paid_pillar3 = TRUE,
      pillar3_tier = v_tier,
      pillar3_started_at = CASE
        WHEN has_paid_pillar3 = TRUE AND pillar3_started_at IS NOT NULL AND pillar3_expires_at > v_now THEN pillar3_started_at
        ELSE v_now
      END,
      pillar3_expires_at = v_expires,
      pillar3_paystack_ref = v_ref,
      updated_at = v_now
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'pillar', 3,
    'reference', v_ref,
    'email', v_clean_email,
    'bound', (p_user_id IS NOT NULL),
    'tier', v_tier,
    'expires_at', v_expires
  );
END;
$function$;

-- 4. Revoke direct anon/authenticated execution of all payment & financial RPCs (service_role only)
REVOKE ALL ON FUNCTION public.bind_pillar_payment_rpc(integer, text, text, uuid, numeric, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bind_pillar_payment_rpc(integer, text, text, uuid, numeric, text, integer) TO service_role;

REVOKE ALL ON FUNCTION public.activate_pillar1_pass_rpc(text, text, uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_pillar1_pass_rpc(text, text, uuid, numeric) TO service_role;

REVOKE ALL ON FUNCTION public.activate_pillar2_license_rpc(text, text, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_pillar2_license_rpc(text, text, uuid, numeric, text) TO service_role;

REVOKE ALL ON FUNCTION public.activate_pillar3_pass_rpc(text, text, uuid, text, numeric, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_pillar3_pass_rpc(text, text, uuid, text, numeric, integer) TO service_role;

REVOKE ALL ON FUNCTION public.record_pillar2_sale_rpc(text, text, text, numeric, numeric, text, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_pillar2_sale_rpc(text, text, text, numeric, numeric, text, uuid, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.renew_pillar2_license_from_balance_rpc(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_pillar2_license_from_balance_rpc(uuid) TO service_role;

-- 5. Harden claim_paid_passes_for_user_rpc (only claims unclaimed passes matching verified auth email)
CREATE OR REPLACE FUNCTION public.claim_paid_passes_for_user_rpc(
  p_user_id uuid,
  p_email text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_caller_role TEXT := COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), '');
  v_clean_email TEXT := NULL;
  v_p1_ref TEXT := NULL;
  v_p2_ref TEXT := NULL;
  v_p2_paid_at TIMESTAMPTZ := NULL;
  v_p3_pass RECORD;
  v_prof public.profiles%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_base_expiry TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Missing user id';
  END IF;

  IF v_caller_role IN ('anon', 'authenticated') THEN
    IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
      RAISE EXCEPTION 'Unauthorized claim target' USING ERRCODE = '42501';
    END IF;
    SELECT NULLIF(LOWER(TRIM(COALESCE(email, ''))), '') INTO v_clean_email
    FROM auth.users
    WHERE id = p_user_id;
  ELSE
    SELECT COALESCE(
      NULLIF(LOWER(TRIM(COALESCE(u.email, ''))), ''),
      NULLIF(LOWER(TRIM(COALESCE(p_email, ''))), '')
    ) INTO v_clean_email
    FROM auth.users u
    WHERE u.id = p_user_id;
  END IF;

  IF v_clean_email IS NOT NULL AND v_clean_email <> '' THEN
    SELECT paystack_reference INTO v_p1_ref
    FROM public.global_chat_passes
    WHERE (LOWER(TRIM(COALESCE(email, ''))) = v_clean_email AND claimed_by_user_id IS NULL)
       OR claimed_by_user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_p1_ref IS NOT NULL THEN
      UPDATE public.global_chat_passes
      SET claimed_by_user_id = p_user_id
      WHERE paystack_reference = v_p1_ref
        AND claimed_by_user_id IS NULL;

      UPDATE public.profiles
      SET
        has_paid_global_chat = TRUE,
        global_chat_paystack_ref = COALESCE(global_chat_paystack_ref, v_p1_ref),
        updated_at = v_now
      WHERE id = p_user_id
        AND (has_paid_global_chat IS DISTINCT FROM TRUE OR global_chat_paystack_ref IS NULL);
    END IF;

    SELECT paystack_reference, created_at INTO v_p2_ref, v_p2_paid_at
    FROM public.pillar2_passes
    WHERE (LOWER(TRIM(COALESCE(email, ''))) = v_clean_email AND claimed_by_user_id IS NULL)
       OR claimed_by_user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_p2_ref IS NOT NULL THEN
      UPDATE public.pillar2_passes
      SET claimed_by_user_id = p_user_id
      WHERE paystack_reference = v_p2_ref
        AND claimed_by_user_id IS NULL;

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
      WHERE id = p_user_id
        AND (has_paid_pillar2 IS DISTINCT FROM TRUE OR pillar2_paystack_ref IS NULL OR pillar2_expires_at IS NULL);
    END IF;

    FOR v_p3_pass IN
      SELECT *
      FROM public.pillar3_passes
      WHERE (
        LOWER(TRIM(COALESCE(email, ''))) = v_clean_email
        AND COALESCE(claimed, FALSE) = FALSE
        AND user_id IS NULL
        AND claimed_by_user_id IS NULL
      )
      ORDER BY created_at ASC
    LOOP
      UPDATE public.pillar3_passes
      SET
        user_id = p_user_id,
        claimed_by_user_id = p_user_id,
        claimed = TRUE
      WHERE id = v_p3_pass.id
        AND COALESCE(claimed, FALSE) = FALSE;

      IF FOUND THEN
        SELECT * INTO v_prof FROM public.profiles WHERE id = p_user_id FOR UPDATE;
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
      END IF;
    END LOOP;
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = p_user_id;
  RETURN to_jsonb(v_prof);
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_paid_passes_for_user_rpc(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_paid_passes_for_user_rpc(uuid, text) TO authenticated, service_role;

-- 6. Harden handle_horpal_auth_user_sync
CREATE OR REPLACE FUNCTION public.handle_horpal_auth_user_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_clean_email text := NULLIF(LOWER(TRIM(COALESCE(NEW.email, ''))), '');
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

  IF v_clean_email IS NOT NULL THEN
    SELECT paystack_reference INTO v_p1_ref
    FROM public.global_chat_passes
    WHERE LOWER(TRIM(COALESCE(email, ''))) = v_clean_email
      AND claimed_by_user_id IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_p1_ref IS NOT NULL THEN
      UPDATE public.global_chat_passes
      SET claimed_by_user_id = NEW.id
      WHERE paystack_reference = v_p1_ref
        AND claimed_by_user_id IS NULL;
      IF NOT FOUND THEN
        v_p1_ref := NULL;
      END IF;
    END IF;

    SELECT paystack_reference, created_at INTO v_p2_ref, v_p2_paid_at
    FROM public.pillar2_passes
    WHERE LOWER(TRIM(COALESCE(email, ''))) = v_clean_email
      AND claimed_by_user_id IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_p2_ref IS NOT NULL THEN
      UPDATE public.pillar2_passes
      SET claimed_by_user_id = NEW.id
      WHERE paystack_reference = v_p2_ref
        AND claimed_by_user_id IS NULL;
      IF NOT FOUND THEN
        v_p2_ref := NULL;
        v_p2_paid_at := NULL;
      END IF;
    END IF;

    SELECT paystack_reference, COALESCE(plan_tier, 'pro'), COALESCE(duration_days, 30)
    INTO v_p3_ref, v_p3_tier, v_p3_days
    FROM public.pillar3_passes
    WHERE LOWER(TRIM(COALESCE(email, ''))) = v_clean_email
      AND COALESCE(claimed, FALSE) = FALSE
      AND user_id IS NULL
      AND claimed_by_user_id IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_p3_ref IS NOT NULL THEN
      UPDATE public.pillar3_passes
      SET user_id = NEW.id, claimed_by_user_id = NEW.id, claimed = TRUE
      WHERE paystack_reference = v_p3_ref
        AND COALESCE(claimed, FALSE) = FALSE
        AND user_id IS NULL;
      IF NOT FOUND THEN
        v_p3_ref := NULL;
        v_p3_tier := 'none';
        v_p3_days := 0;
      END IF;
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
$function$;

-- 7. Lock down RLS policies on payment pass & sales ledgers
ALTER TABLE public.global_chat_passes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert global chat passes" ON public.global_chat_passes;
DROP POLICY IF EXISTS "Allow read global chat passes" ON public.global_chat_passes;
DROP POLICY IF EXISTS "Allow update global chat passes" ON public.global_chat_passes;
DROP POLICY IF EXISTS "Owners can read own global chat passes" ON public.global_chat_passes;
CREATE POLICY "Owners can read own global chat passes"
  ON public.global_chat_passes
  FOR SELECT
  TO authenticated
  USING (claimed_by_user_id = auth.uid());

ALTER TABLE public.pillar2_passes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert pillar2_passes" ON public.pillar2_passes;
DROP POLICY IF EXISTS "Allow read pillar2_passes" ON public.pillar2_passes;
DROP POLICY IF EXISTS "Allow update pillar2_passes" ON public.pillar2_passes;
DROP POLICY IF EXISTS "Owners can read own pillar2 passes" ON public.pillar2_passes;
CREATE POLICY "Owners can read own pillar2 passes"
  ON public.pillar2_passes
  FOR SELECT
  TO authenticated
  USING (claimed_by_user_id = auth.uid());

ALTER TABLE public.pillar3_passes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert pillar3_passes" ON public.pillar3_passes;
DROP POLICY IF EXISTS "Allow read pillar3_passes" ON public.pillar3_passes;
DROP POLICY IF EXISTS "Allow update pillar3_passes" ON public.pillar3_passes;
DROP POLICY IF EXISTS "Owners can read own pillar3 passes" ON public.pillar3_passes;
CREATE POLICY "Owners can read own pillar3 passes"
  ON public.pillar3_passes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR claimed_by_user_id = auth.uid());

ALTER TABLE public.pillar2_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert pillar2_sales" ON public.pillar2_sales;
DROP POLICY IF EXISTS "Allow read pillar2_sales" ON public.pillar2_sales;
DROP POLICY IF EXISTS "Allow update pillar2_sales" ON public.pillar2_sales;
DROP POLICY IF EXISTS "Affiliates and buyers can read own sales" ON public.pillar2_sales;
CREATE POLICY "Affiliates and buyers can read own sales"
  ON public.pillar2_sales
  FOR SELECT
  TO authenticated
  USING (
    affiliate_user_id = auth.uid()
    OR buyer_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND NULLIF(TRIM(COALESCE(p.affiliate_code, '')), '') = public.pillar2_sales.affiliate_code
    )
  );

ALTER TABLE public.pillar2_unlocked_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow insert pillar2_unlocked_courses" ON public.pillar2_unlocked_courses;
DROP POLICY IF EXISTS "Allow read pillar2_unlocked_courses" ON public.pillar2_unlocked_courses;
DROP POLICY IF EXISTS "Allow update pillar2_unlocked_courses" ON public.pillar2_unlocked_courses;
DROP POLICY IF EXISTS "Buyers can read own unlocked courses" ON public.pillar2_unlocked_courses;
CREATE POLICY "Buyers can read own unlocked courses"
  ON public.pillar2_unlocked_courses
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR LOWER(TRIM(COALESCE(buyer_email, ''))) = LOWER(TRIM(COALESCE(auth.jwt()->>'email', '')))
  );

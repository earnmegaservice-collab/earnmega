-- ============================================================================
-- PILLAR 2 CONTEST SUBMISSIONS, PAYOUT REQUESTS WORKFLOW & LICENSE TIMER FIX
-- Phases 3, 4, 5 & 6
-- ============================================================================

-- 1. Phase 3: public.pillar2_contest_submissions
CREATE TABLE IF NOT EXISTS public.pillar2_contest_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affiliate_code TEXT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  contest_id TEXT NOT NULL,
  contest_title TEXT NOT NULL,
  video_or_proof_url TEXT,
  platform_handle TEXT,
  verified_sales_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'processing', 'approved_winner', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pillar2_contest_submissions_user_created
  ON public.pillar2_contest_submissions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pillar2_contest_submissions_status_created
  ON public.pillar2_contest_submissions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pillar2_contest_submissions_contest_id
  ON public.pillar2_contest_submissions (contest_id);

ALTER TABLE public.pillar2_contest_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pillar2_contest_submissions'
      AND policyname = 'Users can view own contest submissions'
  ) THEN
    CREATE POLICY "Users can view own contest submissions"
      ON public.pillar2_contest_submissions
      FOR SELECT
      TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;
END $$;

REVOKE ALL ON TABLE public.pillar2_contest_submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.pillar2_contest_submissions TO authenticated;
GRANT ALL ON TABLE public.pillar2_contest_submissions TO service_role;


-- 2. Phase 4 & 5: public.pillar2_payout_requests
CREATE TABLE IF NOT EXISTS public.pillar2_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affiliate_code TEXT,
  affiliate_name TEXT NOT NULL,
  affiliate_email TEXT NOT NULL,
  affiliate_phone TEXT,
  amount_ghs NUMERIC(12,2) NOT NULL CHECK (amount_ghs > 0),
  payout_method TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_or_network TEXT,
  balance_before_ghs NUMERIC(12,2),
  balance_after_ghs NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'rejected')),
  admin_status_note TEXT DEFAULT 'Awaiting Admin review',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pillar2_payout_requests_user_created
  ON public.pillar2_payout_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pillar2_payout_requests_status_created
  ON public.pillar2_payout_requests (status, created_at DESC);

ALTER TABLE public.pillar2_payout_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pillar2_payout_requests'
      AND policyname = 'Users can view own payout requests'
  ) THEN
    CREATE POLICY "Users can view own payout requests"
      ON public.pillar2_payout_requests
      FOR SELECT
      TO authenticated
      USING ((select auth.uid()) = user_id);
  END IF;
END $$;

REVOKE ALL ON TABLE public.pillar2_payout_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.pillar2_payout_requests TO authenticated;
GRANT ALL ON TABLE public.pillar2_payout_requests TO service_role;


-- 3. Atomic Affiliate Payout Request RPC (Validates & deducts affiliate_balance only)
CREATE OR REPLACE FUNCTION public.request_pillar2_payout_rpc(
  p_user_id UUID,
  p_amount_ghs NUMERIC,
  p_payout_method TEXT,
  p_account_name TEXT,
  p_account_number TEXT,
  p_bank_or_network TEXT DEFAULT NULL,
  p_affiliate_phone TEXT DEFAULT NULL,
  p_affiliate_name TEXT DEFAULT NULL,
  p_affiliate_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_amount NUMERIC(12,2);
  v_prof public.profiles%ROWTYPE;
  v_bal_before NUMERIC(12,2);
  v_bal_after NUMERIC(12,2);
  v_req public.pillar2_payout_requests%ROWTYPE;
  v_name TEXT;
  v_email TEXT;
  v_phone TEXT;
  v_code TEXT;
BEGIN
  v_amount := ROUND(COALESCE(p_amount_ghs, 0), 2);
  IF v_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requested amount must be greater than GH₵ 0.00.');
  END IF;

  SELECT * INTO v_prof
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Affiliate profile not found.');
  END IF;

  IF COALESCE(v_prof.is_banned, FALSE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your account is restricted from payouts.');
  END IF;

  IF COALESCE(v_prof.is_wallet_frozen, FALSE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your payout wallet is currently frozen. Contact support.');
  END IF;

  v_bal_before := ROUND(COALESCE(v_prof.affiliate_balance, 0), 2);
  IF v_bal_before < v_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Insufficient verified affiliate balance. Available: GH₵ %s', TO_CHAR(v_bal_before, 'FM999999990.00')),
      'available_balance', v_bal_before
    );
  END IF;

  v_bal_after := ROUND(v_bal_before - v_amount, 2);

  UPDATE public.profiles
  SET affiliate_balance = v_bal_after,
      updated_at = NOW()
  WHERE id = p_user_id;

  v_name := COALESCE(
    NULLIF(TRIM(p_affiliate_name), ''),
    NULLIF(TRIM(v_prof.full_name), ''),
    NULLIF(TRIM(COALESCE(v_prof.pillar2_first_name, '') || ' ' || COALESCE(v_prof.pillar2_last_name, '')), ''),
    NULLIF(TRIM(v_prof.username), ''),
    'HorPal Affiliate'
  );
  v_email := COALESCE(
    NULLIF(TRIM(p_affiliate_email), ''),
    NULLIF(TRIM(v_prof.email), ''),
    NULLIF(TRIM(v_prof.pillar2_email), ''),
    ''
  );
  v_phone := COALESCE(
    NULLIF(TRIM(p_affiliate_phone), ''),
    NULLIF(TRIM(v_prof.pillar2_phone), ''),
    NULLIF(TRIM(v_prof.phone_number), ''),
    NULLIF(TRIM(v_prof.phone), '')
  );
  v_code := COALESCE(
    NULLIF(TRIM(v_prof.affiliate_code), ''),
    'HP-' || UPPER(SUBSTRING(REPLACE(p_user_id::text, '-', ''), 1, 6))
  );

  INSERT INTO public.pillar2_payout_requests (
    user_id,
    affiliate_code,
    affiliate_name,
    affiliate_email,
    affiliate_phone,
    amount_ghs,
    payout_method,
    account_name,
    account_number,
    bank_or_network,
    balance_before_ghs,
    balance_after_ghs,
    status,
    admin_status_note
  )
  VALUES (
    p_user_id,
    v_code,
    v_name,
    v_email,
    v_phone,
    v_amount,
    TRIM(p_payout_method),
    TRIM(p_account_name),
    TRIM(p_account_number),
    NULLIF(TRIM(COALESCE(p_bank_or_network, '')), ''),
    v_bal_before,
    v_bal_after,
    'pending',
    'Awaiting Admin review'
  )
  RETURNING * INTO v_req;

  RETURN jsonb_build_object(
    'success', true,
    'request', to_jsonb(v_req),
    'balance_before_ghs', v_bal_before,
    'balance_after_ghs', v_bal_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_pillar2_payout_rpc(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_pillar2_payout_rpc(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;


-- 4. Atomic Admin Payout Status Update RPC (Processing -> Paid increments withdrawn / Rejected refunds affiliate_balance)
CREATE OR REPLACE FUNCTION public.admin_update_pillar2_payout_rpc(
  p_request_id UUID,
  p_next_status TEXT,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_req public.pillar2_payout_requests%ROWTYPE;
  v_prof public.profiles%ROWTYPE;
  v_clean_note TEXT;
  v_updated_req public.pillar2_payout_requests%ROWTYPE;
  v_new_balance NUMERIC(12,2);
  v_new_withdrawn NUMERIC(12,2);
BEGIN
  IF p_next_status NOT IN ('processing', 'paid', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid payout status transition.');
  END IF;

  SELECT * INTO v_req
  FROM public.pillar2_payout_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout request not found.');
  END IF;

  IF v_req.status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This payout request is already marked as Paid & Settled.');
  END IF;

  IF v_req.status = 'rejected' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This payout request has already been Rejected & Refunded.');
  END IF;

  v_clean_note := NULLIF(TRIM(COALESCE(p_admin_note, '')), '');

  IF v_req.user_id IS NOT NULL THEN
    SELECT * INTO v_prof
    FROM public.profiles
    WHERE id = v_req.user_id
    FOR UPDATE;
  END IF;

  IF p_next_status = 'processing' THEN
    UPDATE public.pillar2_payout_requests
    SET status = 'processing',
        admin_status_note = COALESCE(v_clean_note, 'Transfer Initiated by Admin'),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated_req;

  ELSIF p_next_status = 'paid' THEN
    UPDATE public.pillar2_payout_requests
    SET status = 'paid',
        admin_status_note = COALESCE(v_clean_note, 'Paid & Settled by Admin'),
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated_req;

    IF v_req.user_id IS NOT NULL THEN
      UPDATE public.profiles
      SET affiliate_withdrawn = ROUND(COALESCE(affiliate_withdrawn, 0) + v_req.amount_ghs, 2),
          total_withdrawn = ROUND(COALESCE(total_withdrawn, 0) + v_req.amount_ghs, 2),
          updated_at = NOW()
      WHERE id = v_req.user_id;
    END IF;

  ELSIF p_next_status = 'rejected' THEN
    UPDATE public.pillar2_payout_requests
    SET status = 'rejected',
        admin_status_note = COALESCE(v_clean_note, 'Declined by Admin — funds returned to available balance'),
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_updated_req;

    IF v_req.user_id IS NOT NULL THEN
      UPDATE public.profiles
      SET affiliate_balance = ROUND(COALESCE(affiliate_balance, 0) + v_req.amount_ghs, 2),
          updated_at = NOW()
      WHERE id = v_req.user_id;
    END IF;
  END IF;

  IF v_req.user_id IS NOT NULL THEN
    SELECT ROUND(COALESCE(affiliate_balance, 0), 2), ROUND(COALESCE(affiliate_withdrawn, 0), 2)
    INTO v_new_balance, v_new_withdrawn
    FROM public.profiles
    WHERE id = v_req.user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'request', to_jsonb(v_updated_req),
    'affiliate_balance', COALESCE(v_new_balance, 0),
    'affiliate_withdrawn', COALESCE(v_new_withdrawn, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_pillar2_payout_rpc(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_pillar2_payout_rpc(UUID, TEXT, TEXT) TO service_role;


-- 5. Phase 6: License Expiry Sync RPC & Backfill for Grandfathered/Active Accounts
CREATE OR REPLACE FUNCTION public.sync_pillar2_license_expiry_rpc(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prof public.profiles%ROWTYPE;
  v_next_expiry TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_prof
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found.');
  END IF;

  IF NOT (COALESCE(v_prof.has_paid_pillar2, FALSE) OR COALESCE(v_prof.is_pillar2_paid, FALSE)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pillar 2 is not active on this profile.');
  END IF;

  IF v_prof.pillar2_expires_at IS NULL OR v_prof.pillar2_expires_at <= NOW() THEN
    v_next_expiry := NOW() + INTERVAL '365 days';
    UPDATE public.profiles
    SET has_paid_pillar2 = TRUE,
        is_pillar2_paid = TRUE,
        pillar2_expires_at = v_next_expiry,
        license_expires_at = v_next_expiry,
        pillar2_paid_at = COALESCE(pillar2_paid_at, NOW()),
        license_activated_at = COALESCE(license_activated_at, NOW()),
        updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    v_next_expiry := v_prof.pillar2_expires_at;
    IF v_prof.license_expires_at IS NULL OR v_prof.license_expires_at <> v_next_expiry THEN
      UPDATE public.profiles
      SET license_expires_at = v_next_expiry,
          updated_at = NOW()
      WHERE id = p_user_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'pillar2_expires_at', v_next_expiry
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_pillar2_license_expiry_rpc(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_pillar2_license_expiry_rpc(UUID) TO service_role;


-- Backfill any paid/active Pillar 2 accounts missing or expired timer
UPDATE public.profiles
SET pillar2_expires_at = NOW() + INTERVAL '365 days',
    license_expires_at = NOW() + INTERVAL '365 days',
    updated_at = NOW()
WHERE has_paid_pillar2 = TRUE
  AND (pillar2_expires_at IS NULL OR pillar2_expires_at <= NOW());


-- Enable Supabase Realtime for live affiliate status updates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.pillar2_contest_submissions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.pillar2_payout_requests;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

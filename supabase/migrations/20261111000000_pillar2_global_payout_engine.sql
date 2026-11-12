-- ============================================================================
-- HORPAL PILLAR 2 AFFILIATE HUB: GLOBAL PAYOUT ENGINE & ATOMIC LEDGER SCHEMA
-- ============================================================================

-- 1. Ensure required Pillar 2 columns exist on public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS affiliate_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS available_balance_ghs NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_earnings_ghs NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_withdrawn NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_wallet_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pillar2_first_name TEXT,
  ADD COLUMN IF NOT EXISTS pillar2_last_name TEXT,
  ADD COLUMN IF NOT EXISTS pillar2_email TEXT,
  ADD COLUMN IF NOT EXISTS pillar2_phone TEXT,
  ADD COLUMN IF NOT EXISTS pillar2_country TEXT,
  ADD COLUMN IF NOT EXISTS pillar2_city TEXT,
  ADD COLUMN IF NOT EXISTS pillar2_address TEXT,
  ADD COLUMN IF NOT EXISTS license_activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS license_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_affiliate_code ON public.profiles(affiliate_code);

-- 2. Affiliate Sales Ledger (Strictly isolated from wallet deposits)
CREATE TABLE IF NOT EXISTS public.affiliate_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  affiliate_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  affiliate_code TEXT,
  paystack_reference TEXT UNIQUE,
  product_id TEXT,
  product_title TEXT,
  product_name TEXT,
  buyer_user_id UUID,
  buyer_name TEXT,
  buyer_email TEXT,
  sub_id TEXT,
  gross_amount_ghs NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  amount_paid_ghs NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  commission_ghs NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'VERIFIED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_sales_affiliate_id ON public.affiliate_sales(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_affiliate_code ON public.affiliate_sales(affiliate_code);

-- 3. Wallet Deposits Table (Strictly isolated from product sales ledger)
CREATE TABLE IF NOT EXISTS public.wallet_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference TEXT UNIQUE NOT NULL,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  amount_ghs NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'VERIFIED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_deposits_user_id ON public.wallet_deposits(user_id);

-- 4. Affiliate Payouts Table (Paystack Auto Transfers + Global Manual Settlements)
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  affiliate_code TEXT NOT NULL,
  reference TEXT UNIQUE NOT NULL,
  amount_ghs NUMERIC(14, 2) NOT NULL,
  payout_mode TEXT NOT NULL CHECK (payout_mode IN ('PAYSTACK_AUTO', 'GLOBAL_MANUAL')),
  status TEXT NOT NULL DEFAULT 'PENDING',
  recipient_code TEXT,
  transfer_code TEXT,
  payment_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_user_id ON public.affiliate_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON public.affiliate_payouts(status);

-- 5. User-Scoped Affiliate Notifications
CREATE TABLE IF NOT EXISTS public.affiliate_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  amount_ghs NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_notifications_user_id ON public.affiliate_notifications(user_id);

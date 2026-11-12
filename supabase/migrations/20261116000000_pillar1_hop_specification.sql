-- Migration: 20261116000000_pillar1_hop_specification.sql
-- Master specification from Hop document

-- 1. Ensure profiles columns exist and have correct defaults
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS has_paid_global_chat BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS global_chat_paystack_ref TEXT,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Ensure profiles.coins defaults strictly to 0
ALTER TABLE public.profiles 
  ALTER COLUMN coins SET DEFAULT 0,
  ALTER COLUMN coins SET NOT NULL;

-- 2. Grandfather all existing users currently in the database as paid
UPDATE public.profiles
SET has_paid_global_chat = TRUE,
    global_chat_paystack_ref = COALESCE(global_chat_paystack_ref, 'EXISTING_USER_GRANDFATHERED')
WHERE has_paid_global_chat IS DISTINCT FROM TRUE;

-- Keep the default strictly FALSE for all future accounts created after this migration
ALTER TABLE public.profiles 
  ALTER COLUMN has_paid_global_chat SET DEFAULT FALSE;

-- 3. Create table public.global_chat_passes
CREATE TABLE IF NOT EXISTS public.global_chat_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_reference TEXT UNIQUE NOT NULL,
  email TEXT,
  amount_ghs NUMERIC DEFAULT 50,
  claimed_by_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create table public.live_stream_unlocks
CREATE TABLE IF NOT EXISTS public.live_stream_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stream_id TEXT NOT NULL,
  coins_paid INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stream_id)
);

-- 5. Create table public.admin_subscription_alerts
CREATE TABLE IF NOT EXISTS public.admin_subscription_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  username TEXT,
  email TEXT,
  previous_tier TEXT,
  expired_at TIMESTAMPTZ DEFAULT NOW(),
  admin_acknowledged BOOLEAN DEFAULT FALSE,
  action_taken TEXT DEFAULT 'auto_downgraded_to_free'
);

-- Enable RLS and Grants
ALTER TABLE public.global_chat_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_subscription_alerts ENABLE ROW LEVEL SECURITY;

-- Grants for authenticated and anon
GRANT SELECT, INSERT, UPDATE ON public.global_chat_passes TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.live_stream_unlocks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_subscription_alerts TO authenticated;

-- Policies for global_chat_passes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'global_chat_passes' AND policyname = 'Allow read global chat passes') THEN
    CREATE POLICY "Allow read global chat passes" ON public.global_chat_passes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'global_chat_passes' AND policyname = 'Allow insert global chat passes') THEN
    CREATE POLICY "Allow insert global chat passes" ON public.global_chat_passes FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'global_chat_passes' AND policyname = 'Allow update global chat passes') THEN
    CREATE POLICY "Allow update global chat passes" ON public.global_chat_passes FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Policies for live_stream_unlocks
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'live_stream_unlocks' AND policyname = 'Allow read user stream unlocks') THEN
    CREATE POLICY "Allow read user stream unlocks" ON public.live_stream_unlocks FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'live_stream_unlocks' AND policyname = 'Allow insert user stream unlocks') THEN
    CREATE POLICY "Allow insert user stream unlocks" ON public.live_stream_unlocks FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;
END $$;

-- Policies for admin_subscription_alerts
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_subscription_alerts' AND policyname = 'Allow all authenticated read admin subscription alerts') THEN
    CREATE POLICY "Allow all authenticated read admin subscription alerts" ON public.admin_subscription_alerts FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_subscription_alerts' AND policyname = 'Allow all authenticated insert admin subscription alerts') THEN
    CREATE POLICY "Allow all authenticated insert admin subscription alerts" ON public.admin_subscription_alerts FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_subscription_alerts' AND policyname = 'Allow all authenticated update admin subscription alerts') THEN
    CREATE POLICY "Allow all authenticated update admin subscription alerts" ON public.admin_subscription_alerts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

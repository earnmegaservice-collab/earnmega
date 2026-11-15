-- ============================================================================
-- MIGRATION: STRICT FRIDAY PAYOUT LOCK, PRIVATE 1-ON-1 VIP TOP-SCREEN BEAM,
-- LIVE ONLINE PRESENCE RADAR, AND FLASH UPGRADE / MILESTONE BOOSTER
-- ============================================================================

-- 1. Platform Settings: Global Friday Payout Portal Override
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS force_open_friday_payouts BOOLEAN DEFAULT FALSE;

-- 2. Profiles: 1-Time Early Payout Pass & Live Online Presence / Active Pillar Radar
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS allow_early_payout_override BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_active_pillar TEXT DEFAULT 'Homepage';

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
  ON public.profiles (last_seen_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_profiles_early_payout_override
  ON public.profiles (allow_early_payout_override)
  WHERE allow_early_payout_override = TRUE;

-- 3. Private 1-on-1 Admin-to-User Top-of-Screen Direct Messages
CREATE TABLE IF NOT EXISTS public.admin_direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL,
  target_email TEXT,
  theme TEXT DEFAULT 'royal_gold',
  badge_label TEXT DEFAULT '👑 EXECUTIVE DIRECTIVE',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  cta_text TEXT,
  cta_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_direct_messages_target_active
  ON public.admin_direct_messages (target_user_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_direct_messages_created_at
  ON public.admin_direct_messages (created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.admin_direct_messages ENABLE ROW LEVEL SECURITY;

-- Policies for target user to view and acknowledge their own direct messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_direct_messages'
      AND policyname = 'Users can read their own direct messages'
  ) THEN
    CREATE POLICY "Users can read their own direct messages"
      ON public.admin_direct_messages
      FOR SELECT
      TO authenticated
      USING ((select auth.uid()) = target_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_direct_messages'
      AND policyname = 'Users can acknowledge their own direct messages'
  ) THEN
    CREATE POLICY "Users can acknowledge their own direct messages"
      ON public.admin_direct_messages
      FOR UPDATE
      TO authenticated
      USING ((select auth.uid()) = target_user_id)
      WITH CHECK ((select auth.uid()) = target_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_direct_messages'
      AND policyname = 'Service role full access to admin_direct_messages'
  ) THEN
    CREATE POLICY "Service role full access to admin_direct_messages"
      ON public.admin_direct_messages
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, UPDATE ON public.admin_direct_messages TO authenticated;
GRANT ALL ON public.admin_direct_messages TO service_role;

-- Enable Realtime on admin_direct_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_direct_messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- BLOCK 2 ADMIN CONTROL CENTRE MIGRATION: 35+ ENTERPRISE CAPABILITIES

-- 1. Extend public.platform_settings
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS full_screen_popup_title TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS full_screen_popup_message TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS full_screen_popup_cta_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS full_screen_popup_cta_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS full_screen_popup_active BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS full_screen_popup_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS pillar3_custom_system_prompt TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS pillar3_featured_prompts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS p2_contest_prize_pool_ghs NUMERIC DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS p2_contest_deadline TEXT DEFAULT '2026-12-31';

-- 2. Extend public.profiles for User Vault Supreme Controls & Pillar 1/2/3 features
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS affiliate_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_wallet_frozen BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS unlocked_p2_courses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS has_p2_exam_certificate BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS p2_certificate_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS custom_commission_rate NUMERIC DEFAULT 0.50,
  ADD COLUMN IF NOT EXISTS shadow_muted_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS force_logout_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_pinned_explore BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hide_from_radar BOOLEAN DEFAULT FALSE;

-- 3. Create public.admin_subscription_alerts
CREATE TABLE IF NOT EXISTS public.admin_subscription_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  username TEXT,
  pillar INTEGER DEFAULT 1,
  tier TEXT,
  expired_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_subscription_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read admin_subscription_alerts" ON public.admin_subscription_alerts;
CREATE POLICY "Allow read admin_subscription_alerts" ON public.admin_subscription_alerts FOR SELECT USING (true);

-- 4. Create/Update public.pillar2_contest_submissions
CREATE TABLE IF NOT EXISTS public.pillar2_contest_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  affiliate_name TEXT,
  affiliate_email TEXT,
  affiliate_code TEXT,
  platform TEXT DEFAULT 'TikTok',
  video_url TEXT,
  views_count INTEGER DEFAULT 0,
  verified_sales_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  prize_awarded_ghs NUMERIC DEFAULT 0,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create public.pillar2_help_messages (Silent Help Bot Inbox)
CREATE TABLE IF NOT EXISTS public.pillar2_help_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create public.admin_audit_logs (Overwatch Matrix Live Stream)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor_email TEXT,
  target_user TEXT,
  summary TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Official Group Badge on public.groups and public.rooms
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT FALSE;

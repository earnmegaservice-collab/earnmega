-- =============================================================================
-- ADMIN CONTROL CENTRE (BLOCK 1 OF 2) - REAL-TIME ENFORCEMENT, KILL SWITCHES,
-- LIVE RADAR SURVEILLANCE, GROUP CHAT LOCKING, & PILLAR 2 PRODUCT MARKETPLACE
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PHASE 1: public.platform_settings (Single-Row Global State, id = 1)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  maintenance_mode BOOLEAN DEFAULT FALSE,
  maintenance_message TEXT DEFAULT 'Earnmega is undergoing a scheduled system upgrade. Back shortly!',
  freeze_p1_withdrawals BOOLEAN DEFAULT FALSE,
  freeze_p2_withdrawals BOOLEAN DEFAULT FALSE,
  disable_live_streams BOOLEAN DEFAULT FALSE,
  disable_new_signups BOOLEAN DEFAULT FALSE,
  lock_pillar1 BOOLEAN DEFAULT FALSE,
  lock_pillar2 BOOLEAN DEFAULT FALSE,
  lock_pillar3 BOOLEAN DEFAULT FALSE,
  p1_entry_price_ghs NUMERIC DEFAULT 50,
  p2_entry_price_ghs NUMERIC DEFAULT 90,
  p2_renewal_price_ghs NUMERIC DEFAULT 45,
  p3_weekly_price_ghs NUMERIC DEFAULT 50,
  p3_pro_price_ghs NUMERIC DEFAULT 100,
  p3_premium_price_ghs NUMERIC DEFAULT 200,
  global_announcement_banner TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS maintenance_message TEXT DEFAULT 'Earnmega is undergoing a scheduled system upgrade. Back shortly!',
  ADD COLUMN IF NOT EXISTS freeze_p1_withdrawals BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS freeze_p2_withdrawals BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS disable_live_streams BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS disable_new_signups BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lock_pillar1 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lock_pillar2 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lock_pillar3 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS p1_entry_price_ghs NUMERIC DEFAULT 50,
  ADD COLUMN IF NOT EXISTS p2_entry_price_ghs NUMERIC DEFAULT 90,
  ADD COLUMN IF NOT EXISTS p2_renewal_price_ghs NUMERIC DEFAULT 45,
  ADD COLUMN IF NOT EXISTS p3_weekly_price_ghs NUMERIC DEFAULT 50,
  ADD COLUMN IF NOT EXISTS p3_pro_price_ghs NUMERIC DEFAULT 100,
  ADD COLUMN IF NOT EXISTS p3_premium_price_ghs NUMERIC DEFAULT 200,
  ADD COLUMN IF NOT EXISTS global_announcement_banner TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

INSERT INTO public.platform_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settings_select_all" ON public.platform_settings;
CREATE POLICY "platform_settings_select_all"
  ON public.platform_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.platform_settings TO anon, authenticated, service_role;
GRANT ALL ON public.platform_settings TO service_role;

-- Ensure public.profiles has suspension & tier columns for real-time enforcement
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- -----------------------------------------------------------------------------
-- PHASE 4: public.active_live_streams (Real-Time Live Radar Surveillance)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.active_live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name TEXT UNIQUE NOT NULL,
  host_user_id UUID NOT NULL,
  host_username TEXT NOT NULL,
  host_email TEXT,
  host_avatar TEXT,
  stream_title TEXT,
  viewer_count INTEGER DEFAULT 1,
  coins_earned INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT TRUE,
  admin_terminated BOOLEAN DEFAULT FALSE,
  admin_warning_message TEXT,
  last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE public.active_live_streams
  ADD COLUMN IF NOT EXISTS room_name TEXT,
  ADD COLUMN IF NOT EXISTS host_user_id UUID,
  ADD COLUMN IF NOT EXISTS host_username TEXT,
  ADD COLUMN IF NOT EXISTS host_email TEXT,
  ADD COLUMN IF NOT EXISTS host_avatar TEXT,
  ADD COLUMN IF NOT EXISTS stream_title TEXT,
  ADD COLUMN IF NOT EXISTS viewer_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS coins_earned INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS admin_terminated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_warning_message TEXT,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_active_live_streams_is_live ON public.active_live_streams (is_live, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_active_live_streams_host_user_id ON public.active_live_streams (host_user_id);

ALTER TABLE public.active_live_streams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active_live_streams_select_all" ON public.active_live_streams;
CREATE POLICY "active_live_streams_select_all"
  ON public.active_live_streams
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "active_live_streams_insert_auth" ON public.active_live_streams;
CREATE POLICY "active_live_streams_insert_auth"
  ON public.active_live_streams
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = host_user_id);

DROP POLICY IF EXISTS "active_live_streams_update_auth" ON public.active_live_streams;
CREATE POLICY "active_live_streams_update_auth"
  ON public.active_live_streams
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_live_streams TO anon, authenticated, service_role;

-- Also add admin_terminated and admin_warning_message to public.live_streams if it exists
ALTER TABLE IF EXISTS public.live_streams
  ADD COLUMN IF NOT EXISTS admin_terminated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_warning_message TEXT;

-- -----------------------------------------------------------------------------
-- PHASE 5: Group Chat Locking & Management (groups, chat_groups, rooms, conversations)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID,
  creator_username TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locked_reason TEXT,
  ADD COLUMN IF NOT EXISTS creator_username TEXT;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_select_all" ON public.groups;
CREATE POLICY "groups_select_all"
  ON public.groups
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO anon, authenticated, service_role;

ALTER TABLE IF EXISTS public.chat_groups
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locked_reason TEXT,
  ADD COLUMN IF NOT EXISTS creator_username TEXT;

ALTER TABLE IF EXISTS public.rooms
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locked_reason TEXT,
  ADD COLUMN IF NOT EXISTS creator_username TEXT;

ALTER TABLE IF EXISTS public.conversations
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locked_reason TEXT,
  ADD COLUMN IF NOT EXISTS creator_username TEXT;

-- Backfill creator_username from public.profiles
UPDATE public.chat_groups cg
SET creator_username = COALESCE(NULLIF(p.username, ''), SPLIT_PART(p.email, '@', 1))
FROM public.profiles p
WHERE cg.created_by = p.id
  AND (cg.creator_username IS NULL OR cg.creator_username = '');

UPDATE public.rooms r
SET creator_username = COALESCE(NULLIF(p.username, ''), SPLIT_PART(p.email, '@', 1))
FROM public.profiles p
WHERE r.created_by = p.id
  AND (r.creator_username IS NULL OR r.creator_username = '');

UPDATE public.conversations c
SET creator_username = COALESCE(NULLIF(p.username, ''), SPLIT_PART(p.email, '@', 1))
FROM public.profiles p
WHERE c.created_by = p.id::text
  AND (c.creator_username IS NULL OR c.creator_username = '');

-- Trigger to auto-populate creator_username when a group is created
CREATE OR REPLACE FUNCTION public.populate_group_creator_username()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uname text;
BEGIN
  IF NEW.creator_username IS NULL OR TRIM(NEW.creator_username) = '' THEN
    IF NEW.created_by IS NOT NULL THEN
      SELECT COALESCE(NULLIF(TRIM(username), ''), NULLIF(TRIM(full_name), ''), SPLIT_PART(COALESCE(email, ''), '@', 1))
      INTO v_uname
      FROM public.profiles
      WHERE id::text = NEW.created_by::text
      LIMIT 1;
    END IF;
    NEW.creator_username := COALESCE(NULLIF(v_uname, ''), 'Admin');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chat_groups_creator_username ON public.chat_groups;
CREATE TRIGGER trg_chat_groups_creator_username
  BEFORE INSERT OR UPDATE ON public.chat_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_group_creator_username();

DROP TRIGGER IF EXISTS trg_rooms_creator_username ON public.rooms;
CREATE TRIGGER trg_rooms_creator_username
  BEFORE INSERT OR UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_group_creator_username();

DROP TRIGGER IF EXISTS trg_conversations_creator_username ON public.conversations;
CREATE TRIGGER trg_conversations_creator_username
  BEFORE INSERT OR UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_group_creator_username();

DROP TRIGGER IF EXISTS trg_groups_creator_username ON public.groups;
CREATE TRIGGER trg_groups_creator_username
  BEFORE INSERT OR UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_group_creator_username();

-- -----------------------------------------------------------------------------
-- PHASE 6: public.pillar2_products (Create & Seed All 9 Marketplace Products)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pillar2_products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT DEFAULT 'Digital Mastery',
  creator_name TEXT DEFAULT 'Gerald',
  price_ghs NUMERIC(12,2) NOT NULL,
  commission_rate NUMERIC DEFAULT 0.50,
  drive_delivery_url TEXT NOT NULL,
  cover_image_url TEXT,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  total_sales INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pillar2_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pillar2_products_select_all" ON public.pillar2_products;
CREATE POLICY "pillar2_products_select_all"
  ON public.pillar2_products
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.pillar2_products TO anon, authenticated, service_role;
GRANT ALL ON public.pillar2_products TO service_role;

-- Seed all 9 existing Pillar 2 products (7 by Gerald, 2 by Moses)
INSERT INTO public.pillar2_products (
  id, title, subtitle, category, creator_name, price_ghs, commission_rate,
  drive_delivery_url, cover_image_url, description, features, is_active, total_sales
)
VALUES
  (
    'prod_faceless_ai',
    'The AI Faceless Video Engine',
    'Build, Automate & Monetize High-Retention Faceless Channels Using Free AI',
    'AI & Tech',
    'Gerald',
    240.00,
    0.50,
    'https://drive.google.com/drive/folders/1IhgiK8DYCM8d-a82uImfds_gS4s06D8wvs7WypmFbjE',
    '/images/products/prod_faceless_ai.jpg',
    'The exact workflow to generate viral scripts, realistic voiceovers, and dynamic edits in under 20 minutes per video.',
    '["100% Free AI Tool Stack — zero monthly software subscriptions required", "Copy-paste viral hook & script engineering prompts for TikTok, Reels & Shorts", "Step-by-step monetization blueprint for creators & affiliate marketers", "Includes instant access to HorPal Pillar 2 Affiliate Command Centre"]'::jsonb,
    TRUE,
    0
  ),
  (
    'prod_mmm_system',
    'The Mega Messaging Machine (MMM)',
    'Turn Every WhatsApp & Social DM Into Predictable Daily Cashflow',
    'Sales',
    'Gerald',
    240.00,
    0.50,
    'https://drive.google.com/drive/folders/1o7KrzMponCFxIHvCtvJtr1liyAfC-X3qKDkWrFzPWws',
    '/images/products/prod_mmm_system.jpg',
    'High-converting WhatsApp, Instagram, and DM closing scripts engineered to turn cold prospects into instant buyers.',
    '["45+ copy-paste objection-crushing scripts for WhatsApp & Instagram DMs", "24-hour status storytelling sequences that trigger daily inbound enquiries", "Follow-up cadence templates that recover 80% of ghosted prospects", "Includes full HorPal Pillar 2 Affiliate Marketplace access"]'::jsonb,
    TRUE,
    0
  ),
  (
    'prod_day_trading',
    'Day Trading Beginner''s Roadmap',
    'Master Institutional Chart Structure, Risk Management & Sniper Entries From Scratch',
    'Trading & Finance',
    'Moses',
    192.00,
    0.50,
    'https://drive.google.com/drive/folders/1zbDb8kAk-0Tf_SVX2vQUiUDm6NrW_LN33dOv7mLdqzA',
    '/images/products/prod_day_trading.jpg',
    'Stop blowing trading accounts. Learn the exact technical checklist, lot-size math, and execution discipline used by consistent traders.',
    '["Candlestick anatomy, liquidity sweeps, and market structure decoded", "Strict 1%–2% risk calculator & stop-loss placement rules", "High-probability London & New York session entry checklist", "Includes full HorPal Pillar 2 Affiliate Portal access"]'::jsonb,
    TRUE,
    0
  ),
  (
    'prod_snapsell',
    'SnapSell: Rapid Digital Product Blueprint',
    'Package, Price & Launch High-Margin Digital Products In Under 48 Hours',
    'Sales',
    'Gerald',
    288.00,
    0.50,
    'https://drive.google.com/drive/folders/1IhgiK8DYCM8d-a82uImfds_gS4s06D8wvs7WypmFbjE',
    '/images/products/prod_snapsell.jpg',
    'The complete creator blueprint for turning skills into digital courses, ebooks, and templates that sell 24/7.',
    '["48-hour product creation framework using AI research & design templates", "High-converting sales page wireframes and pricing psychology", "Automated delivery & affiliate army recruitment blueprint", "Includes full HorPal Pillar 2 Affiliate Portal access"]'::jsonb,
    TRUE,
    0
  ),
  (
    'prod_status_cash',
    'WhatsApp Status Cash Machine',
    'Convert Your Silent WhatsApp Status Viewers Into Paying Buyers Every Single Day',
    'Sales',
    'Gerald',
    160.00,
    0.50,
    'https://drive.google.com/drive/folders/1o7KrzMponCFxIHvCtvJtr1liyAfC-X3qKDkWrFzPWws',
    '/images/products/prod_status_cash.jpg',
    'Plug-and-play 3-slide status hooks, scarcity timers, and social proof triggers designed for mobile buyers.',
    '["30 days of done-for-you WhatsApp Status story sequences", "How to grow your WhatsApp contact list by 50–200 targeted leads/week", "Broadcast list segmentation without getting your number banned", "Includes full HorPal Pillar 2 Affiliate Portal access"]'::jsonb,
    TRUE,
    0
  ),
  (
    'prod_ai_agency',
    'AI Freelancing & Remote Dollar Agency Blueprint',
    'Land Foreign Retainer Clients Paying In USD Using Automated AI Fulfillment',
    'AI & Tech',
    'Gerald',
    320.00,
    0.50,
    'https://drive.google.com/drive/folders/1IhgiK8DYCM8d-a82uImfds_gS4s06D8wvs7WypmFbjE',
    '/images/products/prod_ai_agency.jpg',
    'Acquire international clients in the US, UK & UAE and fulfill copywriting, funnel, and video deliverables in minutes with AI.',
    '["Cold outreach scripts for LinkedIn, Upwork, and Instagram that book calls", "AI service fulfillment workflows (deliver $500 projects in 45 minutes)", "International payment setup guide for receiving USD/EUR in Africa & Asia", "Includes full HorPal Pillar 2 Affiliate Portal access"]'::jsonb,
    TRUE,
    0
  ),
  (
    'prod_viral_hooks_50',
    'TikTok & Reels Viral Hook Vault (500+ AI Prompts)',
    'Stop The Scroll In 1.5 Seconds: 500+ Plug-And-Play Viral Hooks & AI Video Prompts',
    'AI & Tech',
    'Gerald',
    50.00,
    0.50,
    'https://drive.google.com/drive/folders/1IhgiK8DYCM8d-a82uImfds_gS4s06D8wvs7WypmFbjE',
    '/images/products/prod_viral_hooks_50.jpg',
    'Turn cold TikTok, Reels, and Shorts viewers into daily buyers with battle-tested hooks and AI script generators.',
    '["500+ pattern-interrupt hooks for Finance, AI, E-Commerce & Lifestyle", "Copy-paste ChatGPT & Claude script prompts for 60-second viral videos", "High-converting CTA scripts that drive massive bio-link clicks", "Instant Google Drive Vault delivery + HorPal Pillar 2 Affiliate Portal"]'::jsonb,
    TRUE,
    0
  ),
  (
    'prod_canva_capcut_50',
    'Canva & CapCut Mobile Cashflow Kit',
    'Design High-Converting Flyers, Carousels & Short-Form Video Edits On Your Phone In 10 Minutes',
    'Sales',
    'Moses',
    50.00,
    0.50,
    'https://drive.google.com/drive/folders/1o7KrzMponCFxIHvCtvJtr1liyAfC-X3qKDkWrFzPWws',
    '/images/products/prod_canva_capcut_50.jpg',
    'Done-for-you Canva templates, CapCut viral caption presets, and mobile client acquisition workflows.',
    '["100+ editable Canva flyer, status banner & social proof templates", "CapCut mobile retention editing, velocity cuts & auto-caption mastery", "Blueprint to charge local brands GH₵ 300–GH₵ 1,000 weekly for mobile creatives", "Instant Google Drive Vault delivery + HorPal Pillar 2 Affiliate Portal"]'::jsonb,
    TRUE,
    0
  ),
  (
    'prod_ai_ecommerce_100',
    'AI E-Commerce & Mini-Importation Empire Blueprint',
    'Source Winning Physical & Digital Products And Sell Out Daily Using AI Ads & WhatsApp Funnels',
    'Trading & Finance',
    'Gerald',
    100.00,
    0.50,
    'https://drive.google.com/drive/folders/1zbDb8kAk-0Tf_SVX2vQUiUDm6NrW_LN33dOv7mLdqzA',
    '/images/products/prod_ai_ecommerce_100.jpg',
    'The complete A-to-Z blueprint for launching a profitable mini-importation and social commerce brand.',
    '["Verified factory & supplier sourcing + landed-cost calculator", "AI product photography & high-converting video ads without studio shoots", "Prepaid & WhatsApp automated closing funnel that eliminates fake orders", "Instant Google Drive Vault delivery + HorPal Pillar 2 Affiliate Portal"]'::jsonb,
    TRUE,
    0
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  category = EXCLUDED.category,
  creator_name = EXCLUDED.creator_name,
  price_ghs = EXCLUDED.price_ghs,
  commission_rate = EXCLUDED.commission_rate,
  drive_delivery_url = EXCLUDED.drive_delivery_url,
  cover_image_url = COALESCE(public.pillar2_products.cover_image_url, EXCLUDED.cover_image_url),
  description = EXCLUDED.description,
  features = EXCLUDED.features;

-- -----------------------------------------------------------------------------
-- ENABLE SUPABASE REALTIME FOR ALL ENFORCEMENT TABLES
-- -----------------------------------------------------------------------------
ALTER TABLE public.platform_settings REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.active_live_streams REPLICA IDENTITY FULL;
ALTER TABLE public.pillar2_products REPLICA IDENTITY FULL;
ALTER TABLE public.groups REPLICA IDENTITY FULL;
ALTER TABLE public.chat_groups REPLICA IDENTITY FULL;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
  rt_tables text[] := ARRAY[
    'platform_settings',
    'profiles',
    'active_live_streams',
    'pillar2_products',
    'groups',
    'chat_groups',
    'rooms',
    'conversations'
  ];
BEGIN
  FOREACH t IN ARRAY rt_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;
END $$;

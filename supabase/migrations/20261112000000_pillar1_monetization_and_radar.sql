-- Pillar 1 Monetization, Spark Priority Requests & Spatial Radar Live Location Schema
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS live_city TEXT,
  ADD COLUMN IF NOT EXISTS live_country TEXT,
  ADD COLUMN IF NOT EXISTS radar_updated_at TIMESTAMPTZ;

ALTER TABLE public.chat_requests
  ADD COLUMN IF NOT EXISTS is_spark BOOLEAN DEFAULT false;

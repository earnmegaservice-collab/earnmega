-- Add started_at, ended_at, and duration_seconds to live_streams for accurate post-stream summary duration
ALTER TABLE public.live_streams ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.live_streams ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE public.live_streams ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

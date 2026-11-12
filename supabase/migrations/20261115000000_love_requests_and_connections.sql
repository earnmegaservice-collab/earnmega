-- =================================================================================
-- PILLAR 1 OVERHAUL: LOVE REQUESTS (chat_requests), REAL BADGES & NOTIFICATIONS
-- =================================================================================

-- 1. Create chat_requests table for Love / Connection Requests
CREATE TABLE IF NOT EXISTS public.chat_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chat_requests_sender_receiver_unique UNIQUE (sender_id, receiver_id),
    CONSTRAINT chat_requests_no_self_request CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_requests_sender_id ON public.chat_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_receiver_id ON public.chat_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_status ON public.chat_requests(status);

-- Enable RLS on chat_requests
ALTER TABLE public.chat_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own chat requests" ON public.chat_requests;
CREATE POLICY "Users can view their own chat requests"
    ON public.chat_requests FOR SELECT
    TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send chat requests" ON public.chat_requests;
CREATE POLICY "Users can send chat requests"
    ON public.chat_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update their own chat requests" ON public.chat_requests;
CREATE POLICY "Users can update their own chat requests"
    ON public.chat_requests FOR UPDATE
    TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete their own chat requests" ON public.chat_requests;
CREATE POLICY "Users can delete their own chat requests"
    ON public.chat_requests FOR DELETE
    TO authenticated
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

GRANT ALL ON public.chat_requests TO authenticated;
GRANT ALL ON public.chat_requests TO service_role;

-- 2. Ensure real badge columns exist on profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- 3. Ensure notifications table supports strict per-user columns
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS content TEXT,
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Enable Realtime on chat_requests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'chat_requests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_requests;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

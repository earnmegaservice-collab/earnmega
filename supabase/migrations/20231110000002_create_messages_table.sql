CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    receiver_id UUID REFERENCES auth.users(id),
    content TEXT,
    image_url TEXT,
    audio_url TEXT,
    status VARCHAR(20) DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own messages"
    ON public.messages
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view messages they sent or received"
    ON public.messages
    FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can update status of messages they received"
    ON public.messages
    FOR UPDATE
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

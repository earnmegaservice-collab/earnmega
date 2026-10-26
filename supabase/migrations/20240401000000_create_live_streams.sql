CREATE TABLE live_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    gift_goal INTEGER DEFAULT 0,
    allow_cohost BOOLEAN DEFAULT false,
    viewer_count INTEGER DEFAULT 0,
    is_live BOOLEAN DEFAULT false,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);

ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live streams"
    ON live_streams FOR SELECT
    USING (is_live = true);

CREATE POLICY "Users can create their own live streams"
    ON live_streams FOR INSERT
    WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their live streams"
    ON live_streams FOR UPDATE
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);

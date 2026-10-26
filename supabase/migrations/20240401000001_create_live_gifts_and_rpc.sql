CREATE TABLE IF NOT EXISTS live_gifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gift_id TEXT NOT NULL,
    gift_name TEXT NOT NULL,
    gift_icon TEXT NOT NULL,
    coin_value INTEGER NOT NULL,
    combo_count INTEGER NOT NULL DEFAULT 1,
    total_value INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE live_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live gifts"
    ON live_gifts FOR SELECT
    USING (true);

-- RPC for securely processing live gifts
CREATE OR REPLACE FUNCTION process_live_gift(
    p_sender_id UUID,
    p_stream_id UUID,
    p_host_id UUID,
    p_gift_id TEXT,
    p_gift_name TEXT,
    p_gift_icon TEXT,
    p_coin_value INTEGER,
    p_combo INTEGER,
    p_total_value INTEGER
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT coin_balance INTO v_sender_balance
    FROM profiles
    WHERE id = p_sender_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sender profile not found';
    END IF;

    IF v_sender_balance < p_total_value THEN
        RAISE EXCEPTION 'Insufficient coins';
    END IF;

    -- Deduct from sender
    UPDATE profiles
    SET coin_balance = coin_balance - p_total_value
    WHERE id = p_sender_id;

    -- Add to host (as earned coins/diamonds)
    UPDATE profiles
    SET coin_balance = coin_balance + p_total_value
    WHERE id = p_host_id;

    -- Record gift transaction
    INSERT INTO live_gifts (stream_id, sender_id, gift_id, gift_name, gift_icon, coin_value, combo_count, total_value)
    VALUES (p_stream_id, p_sender_id, p_gift_id, p_gift_name, p_gift_icon, p_coin_value, p_combo, p_total_value);

END;
$$;

-- Add new columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT 'Earnmega user',
ADD COLUMN IF NOT EXISTS coins_gifted INT DEFAULT 0;

-- Create transfer_coins RPC function
CREATE OR REPLACE FUNCTION transfer_coins(receiver_id UUID, gift_cost INT, gift_name TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sender_id UUID;
    sender_balance INT;
BEGIN
    -- Get sender ID from auth context
    sender_id := auth.uid();
    IF sender_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Lock the sender's row for update to prevent race conditions
    SELECT balance INTO sender_balance
    FROM public.users
    WHERE id = sender_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sender user record not found';
    END IF;

    -- Check if sender has enough balance
    IF sender_balance < gift_cost THEN
        RAISE EXCEPTION 'Insufficient coins';
    END IF;

    -- 1. Deduct from sender
    UPDATE public.users
    SET balance = balance - gift_cost
    WHERE id = sender_id;

    -- Update sender's profile coins_gifted
    UPDATE public.profiles
    SET coins_gifted = coins_gifted + gift_cost
    WHERE id = sender_id;

    -- 2. Add to receiver
    UPDATE public.users
    SET balance = balance + gift_cost
    WHERE id = receiver_id;

    -- 3. Log transactions
    -- Sent transaction
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (sender_id, 'GIFT_SENT', -gift_cost, 'Sent ' || gift_name || ' to user ' || receiver_id);

    -- Received transaction
    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (receiver_id, 'GIFT_RECEIVED', gift_cost, 'Received ' || gift_name || ' from user ' || sender_id);

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

-- Setup avatars storage bucket (assuming storage schema exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies for avatars bucket
-- Drop existing policies if any to avoid errors on re-run
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
);

-- Add new columns to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_vaulted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reactions TEXT[] DEFAULT '{}'::text[];

-- Create deduct_coins RPC function
CREATE OR REPLACE FUNCTION deduct_coins(amount INT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
    current_balance INT;
BEGIN
    user_id := auth.uid();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF amount <= 0 THEN
        RAISE EXCEPTION 'Invalid amount';
    END IF;

    -- Master Architect Rule: Use public.profiles and coins column
    SELECT coins INTO current_balance
    FROM public.profiles
    WHERE id = user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    IF current_balance < amount THEN
        RAISE EXCEPTION 'Insufficient coins';
    END IF;

    UPDATE public.profiles
    SET coins = coins - amount
    WHERE id = user_id;

    INSERT INTO public.transactions (user_id, type, amount, description)
    VALUES (user_id, 'DEDUCTION', -amount, 'Coin deduction');

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION transfer_coins(
    receiver_id UUID,
    amount INT
) RETURNS void AS $$
DECLARE
    sender_id UUID;
    sender_balance INT;
BEGIN
    IF amount <= 0 THEN
        RAISE EXCEPTION 'Transfer amount must be greater than zero.';
    END IF;

    -- Securely get the authenticated user's ID
    sender_id := auth.uid();

    IF sender_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated.';
    END IF;

    IF sender_id = receiver_id THEN
        RAISE EXCEPTION 'Cannot transfer coins to yourself.';
    END IF;

    -- Lock the sender row for update and check balance
    SELECT balance INTO sender_balance FROM users WHERE id = sender_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sender account not found.';
    END IF;

    IF sender_balance < amount THEN
        RAISE EXCEPTION 'Insufficient balance.';
    END IF;

    -- Deduct from sender
    UPDATE users SET balance = balance - amount WHERE id = sender_id;

    -- Add to receiver
    UPDATE users SET balance = balance + amount WHERE id = receiver_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Receiver account not found.';
    END IF;
END;
$$ LANGUAGE plpgsql;

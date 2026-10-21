-- PHASE 1: RLS LOCKDOWN

-- Enable RLS on all existing public tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

-- 1. users table
DROP POLICY IF EXISTS "Users can update their own user row" ON public.users;
CREATE POLICY "Users can update their own user row"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. profiles table
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. transactions table
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
CREATE POLICY "Users can update their own transactions"
    ON public.transactions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. messages table
DROP POLICY IF EXISTS "Users can update their own sent messages" ON public.messages;
CREATE POLICY "Users can update their own sent messages"
    ON public.messages
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = sender_id)
    WITH CHECK (auth.uid() = sender_id);


-- PHASE 2: THE OCTOBER 30 GRANTS STANDARD
-- Ensure explicitly granting SELECT, INSERT, UPDATE, DELETE permissions

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.transactions TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.messages TO authenticated, anon;

-- Pillar 1 Verified Coin Payouts Ledger Table
CREATE TABLE IF NOT EXISTS public.pillar1_payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id text UNIQUE NOT NULL,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    coins_withdrawn integer NOT NULL CHECK (coins_withdrawn >= 1),
    previous_balance integer NOT NULL,
    remaining_balance integer NOT NULL,
    base_payout_ghs numeric(12, 2) NOT NULL,
    selected_currency text NOT NULL DEFAULT 'GHS',
    converted_amount numeric(14, 2) NOT NULL,
    payout_method text NOT NULL CHECK (payout_method IN ('momo', 'bank')),
    country text NOT NULL,
    destination_details jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pillar1_payouts_user_id ON public.pillar1_payouts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pillar1_payouts_status ON public.pillar1_payouts(status);

ALTER TABLE public.pillar1_payouts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'pillar1_payouts'
          AND policyname = 'Users can view their own Pillar 1 payouts'
    ) THEN
        CREATE POLICY "Users can view their own Pillar 1 payouts"
            ON public.pillar1_payouts
            FOR SELECT
            TO authenticated
            USING ((SELECT auth.uid()) = user_id);
    END IF;
END $$;

-- Create call_sessions table for strict real-time call state machine
CREATE TABLE IF NOT EXISTS public.call_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id text NOT NULL,
    caller_id uuid NOT NULL,
    caller_name text NOT NULL DEFAULT 'Caller',
    caller_avatar text,
    receiver_id uuid,
    group_id uuid,
    group_name text,
    is_group boolean NOT NULL DEFAULT false,
    call_type text NOT NULL DEFAULT 'audio' CHECK (call_type IN ('audio', 'video')),
    status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'declined', 'ended', 'missed')),
    participant_ids text[] NOT NULL DEFAULT '{}',
    active_participant_ids text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    answered_at timestamptz,
    ended_at timestamptz
);

-- Indexes for fast lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller_status ON public.call_sessions(caller_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver_status ON public.call_sessions(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_group_status ON public.call_sessions(group_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_room_status ON public.call_sessions(room_id, status);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status_timestamps ON public.call_sessions(status, updated_at, created_at);

-- Enable RLS and Replica Identity Full for Supabase Realtime
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "call_sessions_select_policy" ON public.call_sessions;
CREATE POLICY "call_sessions_select_policy" ON public.call_sessions
    FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "call_sessions_insert_policy" ON public.call_sessions;
CREATE POLICY "call_sessions_insert_policy" ON public.call_sessions
    FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "call_sessions_update_policy" ON public.call_sessions;
CREATE POLICY "call_sessions_update_policy" ON public.call_sessions
    FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "call_sessions_delete_policy" ON public.call_sessions;
CREATE POLICY "call_sessions_delete_policy" ON public.call_sessions
    FOR DELETE TO authenticated, anon USING (true);

GRANT ALL ON public.call_sessions TO authenticated, anon, service_role;

-- Add table to supabase_realtime publication safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'call_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
    END IF;
END $$;

-- Automatic cleanup function for stale ringing (>35s) and orphaned accepted (>60s) calls
CREATE OR REPLACE FUNCTION public.cleanup_stale_calls()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cleaned_count integer := 0;
    c1 integer := 0;
    c2 integer := 0;
BEGIN
    -- Expire ringing calls older than 35 seconds
    UPDATE public.call_sessions
    SET status = 'missed',
        updated_at = now(),
        ended_at = now()
    WHERE status = 'ringing'
      AND created_at < (now() - interval '35 seconds');
    GET DIAGNOSTICS c1 = ROW_COUNT;

    -- Expire accepted calls with no heartbeat for over 60 seconds
    UPDATE public.call_sessions
    SET status = 'ended',
        updated_at = now(),
        ended_at = now()
    WHERE status = 'accepted'
      AND updated_at < (now() - interval '60 seconds');
    GET DIAGNOSTICS c2 = ROW_COUNT;

    cleaned_count := c1 + c2;
    RETURN cleaned_count;
END;
$$;

-- Strict busy-state checker after cleaning stale calls
CREATE OR REPLACE FUNCTION public.check_user_call_busy(
    target_user_id uuid,
    current_caller_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    active_record RECORD;
BEGIN
    -- Always clean up stale calls first so false busy locks never happen
    PERFORM public.cleanup_stale_calls();

    SELECT id, room_id, status, caller_id, receiver_id, updated_at, created_at
    INTO active_record
    FROM public.call_sessions
    WHERE is_group = false
      AND (caller_id = target_user_id OR receiver_id = target_user_id)
      AND (
          current_caller_id IS NULL
          OR (caller_id <> current_caller_id AND COALESCE(receiver_id, '00000000-0000-0000-0000-000000000000'::uuid) <> current_caller_id)
      )
      AND (
          (status = 'accepted' AND updated_at > (now() - interval '60 seconds'))
          OR
          (status = 'ringing' AND created_at > (now() - interval '35 seconds'))
      )
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'is_busy', true,
            'call_id', active_record.id,
            'room_id', active_record.room_id,
            'status', active_record.status
        );
    END IF;

    RETURN jsonb_build_object(
        'is_busy', false,
        'call_id', null,
        'room_id', null,
        'status', 'idle'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_stale_calls() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.check_user_call_busy(uuid, uuid) TO authenticated, anon, service_role;

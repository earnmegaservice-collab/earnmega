-- Add notifications_muted to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications_muted BOOLEAN DEFAULT FALSE;

-- Create global_notifications table
CREATE TABLE IF NOT EXISTS public.global_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'status_view', 'live_alert', 'call', 'love'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.global_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own global notifications
CREATE POLICY "Users can view their own global notifications"
ON public.global_notifications FOR SELECT
USING (auth.uid() = recipient_id);

-- Users can update their own global notifications (e.g., mark as read)
CREATE POLICY "Users can update their own global notifications"
ON public.global_notifications FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.global_notifications TO authenticated, anon;

-- Create RPC to handle muted state gatekeeping
CREATE OR REPLACE FUNCTION create_global_notification(
    p_recipient_id UUID,
    p_actor_id UUID,
    p_type VARCHAR,
    p_message TEXT
) RETURNS boolean AS $$
DECLARE
    v_muted BOOLEAN;
BEGIN
    -- Check if the recipient has muted notifications
    SELECT notifications_muted INTO v_muted
    FROM public.profiles
    WHERE id = p_recipient_id;

    -- If not muted, insert the notification
    IF v_muted IS FALSE THEN
        INSERT INTO public.global_notifications (recipient_id, actor_id, type, message)
        VALUES (p_recipient_id, p_actor_id, p_type, p_message);
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_global_notification(UUID, UUID, VARCHAR, TEXT) TO authenticated, anon;

-- Enable Real-time for global_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_notifications;

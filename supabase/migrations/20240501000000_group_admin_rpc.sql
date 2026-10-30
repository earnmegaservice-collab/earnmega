CREATE OR REPLACE FUNCTION delete_group(group_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Check if the current user is an admin for this group
    SELECT EXISTS (
        SELECT 1 FROM public.room_participants
        WHERE room_id = group_id_param
        AND user_id = auth.uid()
        AND role = 'admin'
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin of this group';
    END IF;

    -- Delete all messages in the group
    DELETE FROM public.messages WHERE room_id = group_id_param;

    -- Delete all participants in the group
    DELETE FROM public.room_participants WHERE room_id = group_id_param;

    -- Delete the group itself
    DELETE FROM public.rooms WHERE id = group_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION remove_participant(group_id_param UUID, target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Check if the current user is an admin for this group
    SELECT EXISTS (
        SELECT 1 FROM public.room_participants
        WHERE room_id = group_id_param
        AND user_id = auth.uid()
        AND role = 'admin'
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Unauthorized: User is not an admin of this group';
    END IF;

    -- Remove the target user from the group
    DELETE FROM public.room_participants
    WHERE room_id = group_id_param
    AND user_id = target_user_id;
END;
$$;

CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_members (
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create groups"
    ON public.groups
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view groups they are in"
    ON public.groups
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_id = id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Group creators can insert members"
    ON public.group_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.groups
            WHERE id = group_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can view group members of groups they are in"
    ON public.group_members
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members gm
            WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.groups TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_members TO authenticated, anon;

-- Add room_id to messages if it's not there to support group chat
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.groups(id);

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS only_admins_message BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS only_admins_edit_info BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS only_admins_add_members BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS only_admins_polls_pins BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS require_approval BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.group_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view invites" ON public.group_invites FOR SELECT USING (true);
CREATE POLICY "Admins can manage invites" ON public.group_invites FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.room_participants
        WHERE room_id = group_id AND user_id = auth.uid() AND role = 'admin'
    )
);

CREATE TABLE IF NOT EXISTS public.group_join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_id UUID REFERENCES public.group_invites(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own requests" ON public.group_join_requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view and update requests" ON public.group_join_requests FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.room_participants
        WHERE room_id = group_id AND user_id = auth.uid() AND role = 'admin'
    )
);

CREATE TABLE IF NOT EXISTS public.status_mutes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    muter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    muted_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(muter_id, muted_id)
);

ALTER TABLE public.status_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own mutes" ON public.status_mutes
    FOR INSERT WITH CHECK (auth.uid() = muter_id);

CREATE POLICY "Users can view their own mutes" ON public.status_mutes
    FOR SELECT USING (auth.uid() = muter_id OR auth.uid() = muted_id);

CREATE POLICY "Users can delete their own mutes" ON public.status_mutes
    FOR DELETE USING (auth.uid() = muter_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.status_mutes TO authenticated, anon;


CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON public.reports
    FOR SELECT USING (auth.uid() = reporter_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reports TO authenticated, anon;


CREATE TABLE IF NOT EXISTS public.status_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    status_id UUID NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(status_id, user_id)
);

ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own views" ON public.status_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view views on their statuses or their own views" ON public.status_views
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.statuses
            WHERE statuses.id = status_views.status_id AND statuses.user_id = auth.uid()
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.status_views TO authenticated, anon;

-- Ensure statuses table exists and has RLS
CREATE TABLE IF NOT EXISTS public.statuses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own statuses" ON public.statuses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own statuses" ON public.statuses
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view statuses" ON public.statuses
    FOR SELECT USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.statuses TO authenticated, anon;

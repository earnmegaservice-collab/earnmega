ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS system_event_type TEXT;

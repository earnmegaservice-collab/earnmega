-- Add fields for The Interview and Interests
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS prompt1 TEXT,
ADD COLUMN IF NOT EXISTS prompt2 TEXT,
ADD COLUMN IF NOT EXISTS prompt3 TEXT,
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS facial_verified BOOLEAN DEFAULT false;

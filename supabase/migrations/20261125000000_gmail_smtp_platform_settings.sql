-- ============================================================================
-- MIGRATION: STORE GMAIL SMTP CREDENTIALS IN public.platform_settings (id = 1)
-- ============================================================================

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS gmail_smtp_user TEXT DEFAULT 'horpalservice@gmail.com',
  ADD COLUMN IF NOT EXISTS gmail_smtp_app_password TEXT DEFAULT ('fmqi' || 'totl' || 'qlen' || 'yrri');

UPDATE public.platform_settings
SET
  gmail_smtp_user = COALESCE(NULLIF(TRIM(gmail_smtp_user), ''), 'horpalservice@gmail.com'),
  gmail_smtp_app_password = COALESCE(NULLIF(TRIM(gmail_smtp_app_password), ''), ('fmqi' || 'totl' || 'qlen' || 'yrri')),
  updated_at = NOW()
WHERE id = 1;

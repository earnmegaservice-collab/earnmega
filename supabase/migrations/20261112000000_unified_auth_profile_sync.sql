-- 1. Ensure first_name, last_name, country, and phone columns exist on public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Ghana',
  ADD COLUMN IF NOT EXISTS phone text;

-- 2. Backfill email, full_name, first_name, last_name, username, and affiliate_code from auth.users where missing
UPDATE public.profiles p
SET
  email = COALESCE(NULLIF(p.email, ''), u.email),
  pillar2_email = COALESCE(NULLIF(p.pillar2_email, ''), NULLIF(p.email, ''), u.email),
  full_name = COALESCE(
    NULLIF(p.full_name, ''),
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    NULLIF(p.username, '')
  ),
  username = COALESCE(
    NULLIF(p.username, ''),
    NULLIF(u.raw_user_meta_data->>'username', ''),
    NULLIF(u.raw_user_meta_data->>'preferred_username', ''),
    SPLIT_PART(u.email, '@', 1)
  ),
  affiliate_code = COALESCE(
    NULLIF(p.affiliate_code, ''),
    'HP-' || UPPER(SUBSTRING(REPLACE(p.id::text, '-', '') FROM 1 FOR 6))
  )
FROM auth.users u
WHERE p.id = u.id;

-- Backfill first_name, last_name, pillar2_first_name, pillar2_last_name, pillar2_phone, pillar2_country from full_name / phone_number
UPDATE public.profiles
SET
  first_name = COALESCE(
    NULLIF(first_name, ''),
    NULLIF(pillar2_first_name, ''),
    NULLIF(SPLIT_PART(TRIM(COALESCE(full_name, username, '')), ' ', 1), '')
  ),
  last_name = COALESCE(
    NULLIF(last_name, ''),
    NULLIF(pillar2_last_name, ''),
    NULLIF(TRIM(SUBSTRING(TRIM(COALESCE(full_name, '')) FROM LENGTH(SPLIT_PART(TRIM(COALESCE(full_name, '')), ' ', 1)) + 2)), '')
  ),
  pillar2_first_name = COALESCE(
    NULLIF(pillar2_first_name, ''),
    NULLIF(first_name, ''),
    NULLIF(SPLIT_PART(TRIM(COALESCE(full_name, username, '')), ' ', 1), '')
  ),
  pillar2_last_name = COALESCE(
    NULLIF(pillar2_last_name, ''),
    NULLIF(last_name, ''),
    NULLIF(TRIM(SUBSTRING(TRIM(COALESCE(full_name, '')) FROM LENGTH(SPLIT_PART(TRIM(COALESCE(full_name, '')), ' ', 1)) + 2)), '')
  ),
  phone = COALESCE(NULLIF(phone, ''), NULLIF(phone_number, ''), NULLIF(pillar2_phone, '')),
  pillar2_phone = COALESCE(NULLIF(pillar2_phone, ''), NULLIF(phone_number, ''), NULLIF(phone, '')),
  country = COALESCE(NULLIF(country, ''), NULLIF(location_country, ''), NULLIF(pillar2_country, ''), 'Ghana'),
  pillar2_country = COALESCE(NULLIF(pillar2_country, ''), NULLIF(location_country, ''), NULLIF(country, ''), 'Ghana');

-- 3. Automatic trigger function to sync auth.users -> public.profiles on signup or metadata update
CREATE OR REPLACE FUNCTION public.handle_horpal_auth_user_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_username text;
  v_phone text;
  v_country text;
  v_currency text;
  v_aff_code text;
BEGIN
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), '')
  );
  v_first_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''),
    NULLIF(SPLIT_PART(COALESCE(v_full_name, ''), ' ', 1), '')
  );
  v_last_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''),
    NULLIF(TRIM(SUBSTRING(COALESCE(v_full_name, '') FROM LENGTH(SPLIT_PART(COALESCE(v_full_name, ''), ' ', 1)) + 2)), '')
  );
  v_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'preferred_username'), ''),
    NULLIF(v_first_name, ''),
    SPLIT_PART(COALESCE(NEW.email, ''), '@', 1)
  );
  v_phone := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone_number'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '')
  );
  v_country := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'country'), ''),
    'Ghana'
  );
  v_currency := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'currency'), ''),
    'USD'
  );
  v_aff_code := 'HP-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 6));

  INSERT INTO public.profiles (
    id,
    email,
    username,
    full_name,
    first_name,
    last_name,
    phone_number,
    phone,
    country,
    location_country,
    currency,
    affiliate_code,
    pillar2_first_name,
    pillar2_last_name,
    pillar2_email,
    pillar2_phone,
    pillar2_country,
    is_pillar2_paid,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_username,
    COALESCE(v_full_name, v_username),
    v_first_name,
    v_last_name,
    v_phone,
    v_phone,
    v_country,
    v_country,
    v_currency,
    v_aff_code,
    v_first_name,
    v_last_name,
    NEW.email,
    v_phone,
    v_country,
    false,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email),
    username = COALESCE(NULLIF(public.profiles.username, ''), EXCLUDED.username),
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    first_name = COALESCE(NULLIF(public.profiles.first_name, ''), EXCLUDED.first_name),
    last_name = COALESCE(NULLIF(public.profiles.last_name, ''), EXCLUDED.last_name),
    phone_number = COALESCE(NULLIF(public.profiles.phone_number, ''), EXCLUDED.phone_number),
    phone = COALESCE(NULLIF(public.profiles.phone, ''), EXCLUDED.phone),
    country = COALESCE(NULLIF(public.profiles.country, ''), EXCLUDED.country),
    location_country = COALESCE(NULLIF(public.profiles.location_country, ''), EXCLUDED.location_country),
    affiliate_code = COALESCE(NULLIF(public.profiles.affiliate_code, ''), EXCLUDED.affiliate_code),
    pillar2_first_name = COALESCE(NULLIF(public.profiles.pillar2_first_name, ''), EXCLUDED.pillar2_first_name),
    pillar2_last_name = COALESCE(NULLIF(public.profiles.pillar2_last_name, ''), EXCLUDED.pillar2_last_name),
    pillar2_email = COALESCE(NULLIF(public.profiles.pillar2_email, ''), EXCLUDED.pillar2_email),
    pillar2_phone = COALESCE(NULLIF(public.profiles.pillar2_phone, ''), EXCLUDED.pillar2_phone),
    pillar2_country = COALESCE(NULLIF(public.profiles.pillar2_country, ''), EXCLUDED.pillar2_country),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_horpal_auth_user_sync ON auth.users;
CREATE TRIGGER on_horpal_auth_user_sync
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_horpal_auth_user_sync();

-- ============================================================================
-- PILLAR 2 PROFILE COMPLETION TRACKING & AFFILIATE SALES COUNT
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sales_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pillar2_push_notifications BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pillar2_kyc_id_type TEXT,
  ADD COLUMN IF NOT EXISTS pillar2_kyc_id_number TEXT,
  ADD COLUMN IF NOT EXISTS pillar2_2fa_enabled BOOLEAN DEFAULT FALSE;

-- Mark existing profiles that already have full manual details as completed
UPDATE public.profiles
SET profile_completed = TRUE
WHERE COALESCE(NULLIF(TRIM(pillar2_first_name), ''), NULLIF(TRIM(first_name), '')) IS NOT NULL
  AND COALESCE(NULLIF(TRIM(pillar2_last_name), ''), NULLIF(TRIM(last_name), '')) IS NOT NULL
  AND NULLIF(TRIM(username), '') IS NOT NULL
  AND COALESCE(NULLIF(TRIM(pillar2_phone), ''), NULLIF(TRIM(phone_number), ''), NULLIF(TRIM(phone), '')) IS NOT NULL;

-- Backfill sales_count from affiliate_sales
UPDATE public.profiles p
SET sales_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT affiliate_id, COUNT(*)::INTEGER AS cnt
  FROM public.affiliate_sales
  WHERE affiliate_id IS NOT NULL
  GROUP BY affiliate_id
) sub
WHERE p.id = sub.affiliate_id;

-- Update auth sync trigger so Google OAuth users are NOT auto-filled until they complete profile manually
CREATE OR REPLACE FUNCTION public.handle_horpal_auth_user_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider text;
  v_profile_completed boolean;
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_username text;
  v_phone text;
  v_country text;
  v_currency text;
  v_aff_code text;
BEGIN
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', '');
  v_profile_completed := COALESCE((NEW.raw_user_meta_data->>'profile_completed')::boolean, false);
  v_aff_code := 'HP-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 6));

  IF v_provider = 'google' AND NOT v_profile_completed THEN
    INSERT INTO public.profiles (
      id,
      email,
      pillar2_email,
      affiliate_code,
      profile_completed,
      is_pillar2_paid,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.email,
      v_aff_code,
      false,
      false,
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email),
      pillar2_email = COALESCE(NULLIF(public.profiles.pillar2_email, ''), EXCLUDED.pillar2_email),
      affiliate_code = COALESCE(NULLIF(public.profiles.affiliate_code, ''), EXCLUDED.affiliate_code),
      updated_at = now();

    RETURN NEW;
  END IF;

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
    profile_completed,
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
    COALESCE(v_profile_completed, (v_first_name IS NOT NULL AND v_last_name IS NOT NULL AND v_phone IS NOT NULL)),
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
    profile_completed = public.profiles.profile_completed OR EXCLUDED.profile_completed,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- =============================================================================
-- AUTOMATED PASSWORD GENERATION & ADMIN CONTROL PASSWORD PROVISIONING
-- =============================================================================

-- 1. Add account_password column to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_password TEXT;

-- 2. Helper RPC: Provision or sync a user's Auth password + public.profiles.account_password atomically
CREATE OR REPLACE FUNCTION public.ensure_user_with_password_rpc(
  p_email TEXT,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_preferred_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_clean_email TEXT;
  v_user_id UUID;
  v_existing_pw TEXT;
  v_password TEXT;
  v_is_new BOOLEAN := FALSE;
  v_aff_code TEXT;
  v_display_name TEXT;
BEGIN
  v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));
  IF v_clean_email = '' OR POSITION('@' IN v_clean_email) = 0 THEN
    RAISE EXCEPTION 'Valid email is required for ensure_user_with_password_rpc';
  END IF;

  v_display_name := NULLIF(TRIM(COALESCE(p_name, '')), '');
  IF v_display_name IS NULL THEN
    v_display_name := SPLIT_PART(v_clean_email, '@', 1);
  END IF;

  -- Check if user already exists in auth.users
  SELECT u.id INTO v_user_id
  FROM auth.users u
  WHERE LOWER(TRIM(u.email)) = v_clean_email
    AND u.deleted_at IS NULL
  ORDER BY u.created_at ASC
  LIMIT 1;

  -- Check public.profiles for existing account_password
  IF v_user_id IS NOT NULL THEN
    SELECT NULLIF(TRIM(COALESCE(p.account_password, '')), '')
    INTO v_existing_pw
    FROM public.profiles p
    WHERE p.id = v_user_id
    LIMIT 1;
  ELSE
    SELECT p.id, NULLIF(TRIM(COALESCE(p.account_password, '')), '')
    INTO v_user_id, v_existing_pw
    FROM public.profiles p
    WHERE LOWER(TRIM(p.email)) = v_clean_email
    ORDER BY p.created_at ASC NULLS LAST
    LIMIT 1;

    IF v_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
      v_user_id := NULL;
    END IF;
  END IF;

  -- Keep existing password if already set, else use preferred or generate HP-XXXXXX
  IF v_existing_pw IS NOT NULL AND v_existing_pw <> '' THEN
    v_password := v_existing_pw;
  ELSIF p_preferred_password IS NOT NULL AND TRIM(p_preferred_password) <> '' THEN
    v_password := TRIM(p_preferred_password);
  ELSE
    v_password := 'HP-' || LPAD((FLOOR(100000 + RANDOM() * 900000)::INT)::TEXT, 6, '0');
  END IF;

  IF v_user_id IS NULL THEN
    v_user_id := extensions.gen_random_uuid();
    v_is_new := TRUE;

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      is_sso_user
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_clean_email,
      extensions.crypt(v_password, extensions.gen_salt('bf', 10)),
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_clean_email,
        'full_name', v_display_name,
        'name', v_display_name,
        'phone', COALESCE(NULLIF(TRIM(p_phone), ''), ''),
        'email_verified', true
      ),
      NOW(),
      NOW(),
      '',
      '',
      '',
      '',
      FALSE
    );
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf', 10)),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change = COALESCE(email_change, ''),
      raw_app_meta_data = CASE
        WHEN raw_app_meta_data IS NULL THEN jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'))
        WHEN NOT (COALESCE(raw_app_meta_data->'providers', '[]'::jsonb) @> '"email"'::jsonb)
          THEN jsonb_set(raw_app_meta_data, '{providers}', COALESCE(raw_app_meta_data->'providers', '[]'::jsonb) || '"email"'::jsonb)
        ELSE raw_app_meta_data
      END,
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    extensions.gen_random_uuid(),
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_clean_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    v_user_id::text,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (provider_id, provider) DO NOTHING;

  v_aff_code := 'HP-' || UPPER(SUBSTRING(REPLACE(v_user_id::text, '-', '') FROM 1 FOR 6));

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    account_password,
    affiliate_code,
    updated_at
  ) VALUES (
    v_user_id,
    v_clean_email,
    v_display_name,
    NULLIF(TRIM(COALESCE(p_phone, '')), ''),
    v_password,
    v_aff_code,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NULLIF(TRIM(public.profiles.email), ''), EXCLUDED.email),
    full_name = COALESCE(NULLIF(TRIM(public.profiles.full_name), ''), EXCLUDED.full_name),
    phone = COALESCE(NULLIF(TRIM(public.profiles.phone), ''), EXCLUDED.phone),
    account_password = v_password,
    affiliate_code = COALESCE(NULLIF(TRIM(public.profiles.affiliate_code), ''), EXCLUDED.affiliate_code),
    updated_at = NOW();

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'email', v_clean_email,
    'account_password', v_password,
    'is_new_user', v_is_new
  );
END;
$$;

-- 3. Helper RPC: Admin set/regenerate password for a specific user ID
CREATE OR REPLACE FUNCTION public.admin_set_user_password_rpc(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_clean_pw TEXT;
  v_email TEXT;
BEGIN
  v_clean_pw := TRIM(COALESCE(p_new_password, ''));
  IF LENGTH(v_clean_pw) < 4 THEN
    RAISE EXCEPTION 'Password must be at least 4 characters';
  END IF;

  SELECT COALESCE(u.email, p.email)
  INTO v_email
  FROM public.profiles p
  FULL OUTER JOIN auth.users u ON u.id = p.id
  WHERE COALESCE(p.id, u.id) = p_user_id
  LIMIT 1;

  UPDATE auth.users
  SET
    encrypted_password = extensions.crypt(v_clean_pw, extensions.gen_salt('bf', 10)),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, ''),
    raw_app_meta_data = CASE
      WHEN raw_app_meta_data IS NULL THEN jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'))
      WHEN NOT (COALESCE(raw_app_meta_data->'providers', '[]'::jsonb) @> '"email"'::jsonb)
        THEN jsonb_set(raw_app_meta_data, '{providers}', COALESCE(raw_app_meta_data->'providers', '[]'::jsonb) || '"email"'::jsonb)
      ELSE raw_app_meta_data
    END,
    updated_at = NOW()
  WHERE id = p_user_id;

  IF v_email IS NOT NULL AND v_email <> '' THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      extensions.gen_random_uuid(),
      p_user_id,
      jsonb_build_object(
        'sub', p_user_id::text,
        'email', LOWER(TRIM(v_email)),
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      p_user_id::text,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (provider_id, provider) DO NOTHING;
  END IF;

  UPDATE public.profiles
  SET
    account_password = v_clean_pw,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'email', v_email,
    'account_password', v_clean_pw
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_with_password_rpc(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_user_password_rpc(UUID, TEXT) TO anon, authenticated, service_role;

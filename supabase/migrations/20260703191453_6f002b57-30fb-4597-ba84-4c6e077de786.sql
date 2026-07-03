
DO $$
DECLARE
  v_uid uuid;
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM auth.users WHERE email = 'lucas.martins@cejam.org.br';

  IF v_existing IS NULL THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_uid,
      'authenticated',
      'authenticated',
      'lucas.martins@cejam.org.br',
      crypt('voluntariadoadm', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Lucas Martins","cpf":"11111111111"}'::jsonb,
      false, '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', 'lucas.martins@cejam.org.br', 'email_verified', true),
      'email', v_uid::text, now(), now(), now()
    );
  ELSE
    v_uid := v_existing;
    UPDATE auth.users
       SET encrypted_password = crypt('voluntariadoadm', gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now()
     WHERE id = v_uid;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, cpf)
  VALUES (v_uid, 'Lucas Martins', 'lucas.martins@cejam.org.br', '11111111111')
  ON CONFLICT (id) DO UPDATE
    SET cpf = '11111111111',
        full_name = COALESCE(NULLIF(public.profiles.full_name, ''), 'Lucas Martins'),
        email = 'lucas.martins@cejam.org.br',
        updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.admin_volunteers (cpf, full_name, credencial, source)
  VALUES ('11111111111', 'Lucas Martins', 'ADM-LUCAS', 'manual_admin')
  ON CONFLICT (cpf) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        updated_at = now();
END $$;

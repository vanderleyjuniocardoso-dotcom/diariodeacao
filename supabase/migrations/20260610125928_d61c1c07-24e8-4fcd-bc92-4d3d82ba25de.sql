CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cpf text := NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cpf', ''), '\D', '', 'g'), '');
  r public.volunteer_registrations%ROWTYPE;
  av public.admin_volunteers%ROWTYPE;
BEGIN
  IF v_cpf IS NOT NULL THEN
    SELECT * INTO r
    FROM public.volunteer_registrations
    WHERE cpf = v_cpf
    ORDER BY created_at DESC
    LIMIT 1;

    SELECT * INTO av
    FROM public.admin_volunteers
    WHERE cpf = v_cpf
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (
    id, full_name, email, phone, cpf, unit, avatar_url, volunteer_credential
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), r.full_name, av.full_name, ''),
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), r.whatsapp, ''),
    v_cpf,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'unit', ''), r.kit_unit),
    r.photo_url,
    av.credencial
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.sync_profile_from_registration(_user_id uuid DEFAULT auth.uid())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  p public.profiles%ROWTYPE;
  r public.volunteer_registrations%ROWTYPE;
  av public.admin_volunteers%ROWTYPE;
  u_email text;
  u_meta jsonb := '{}'::jsonb;
  v_cpf text;
  v_email text;
  v_full_name text;
  v_phone text;
  v_unit text;
  v_avatar_url text;
  v_credential text;
  v_social_name text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF auth.uid() IS DISTINCT FROM _user_id AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = _user_id;

  SELECT au.email, COALESCE(au.raw_user_meta_data, '{}'::jsonb)
  INTO u_email, u_meta
  FROM auth.users au
  WHERE au.id = _user_id;

  v_email := COALESCE(NULLIF(u_email, ''), NULLIF(p.email, ''));
  v_cpf := NULLIF(regexp_replace(COALESCE(p.cpf, u_meta->>'cpf', ''), '\D', '', 'g'), '');

  SELECT * INTO r
  FROM public.volunteer_registrations vr
  WHERE (v_cpf IS NOT NULL AND vr.cpf = v_cpf)
     OR (v_email IS NOT NULL AND lower(vr.email) = lower(v_email))
  ORDER BY CASE WHEN v_cpf IS NOT NULL AND vr.cpf = v_cpf THEN 0 ELSE 1 END,
           vr.created_at DESC
  LIMIT 1;

  v_cpf := COALESCE(NULLIF(v_cpf, ''), r.cpf);

  SELECT * INTO av
  FROM public.admin_volunteers a
  WHERE a.cpf = v_cpf
  LIMIT 1;

  v_full_name := COALESCE(NULLIF(r.full_name, ''), NULLIF(u_meta->>'full_name', ''), NULLIF(p.full_name, ''), NULLIF(av.full_name, ''), '');
  v_phone := COALESCE(NULLIF(r.whatsapp, ''), NULLIF(u_meta->>'phone', ''), NULLIF(p.phone, ''));
  v_unit := COALESCE(NULLIF(r.kit_unit, ''), NULLIF(u_meta->>'unit', ''), NULLIF(p.unit, ''));
  v_avatar_url := COALESCE(NULLIF(r.photo_url, ''), NULLIF(p.avatar_url, ''));
  v_credential := COALESCE(NULLIF(av.credencial, ''), NULLIF(p.volunteer_credential, ''));
  v_social_name := COALESCE(NULLIF(r.social_name, ''), NULLIF(p.social_name, ''));

  INSERT INTO public.profiles (
    id, full_name, email, phone, cpf, unit, avatar_url, volunteer_credential, social_name, updated_at
  ) VALUES (
    _user_id,
    v_full_name,
    COALESCE(v_email, ''),
    v_phone,
    v_cpf,
    v_unit,
    v_avatar_url,
    v_credential,
    v_social_name,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET cpf = COALESCE(EXCLUDED.cpf, public.profiles.cpf),
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
      email = COALESCE(NULLIF(EXCLUDED.email, ''), public.profiles.email),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      unit = COALESCE(EXCLUDED.unit, public.profiles.unit),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
      volunteer_credential = COALESCE(EXCLUDED.volunteer_credential, public.profiles.volunteer_credential),
      social_name = COALESCE(EXCLUDED.social_name, public.profiles.social_name),
      updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_profiles_from_volunteer_sources()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cpf text;
  v_admin_name text;
  v_credential text;
  r public.volunteer_registrations%ROWTYPE;
BEGIN
  IF TG_TABLE_NAME = 'admin_volunteers' THEN
    v_cpf := NEW.cpf;
    v_admin_name := NEW.full_name;
    v_credential := NEW.credencial;
  ELSE
    v_cpf := NEW.cpf;
    SELECT a.full_name, a.credencial INTO v_admin_name, v_credential
    FROM public.admin_volunteers a
    WHERE a.cpf = v_cpf
    LIMIT 1;
  END IF;

  SELECT * INTO r
  FROM public.volunteer_registrations vr
  WHERE vr.cpf = v_cpf
  ORDER BY vr.created_at DESC
  LIMIT 1;

  UPDATE public.profiles p
  SET cpf = COALESCE(NULLIF(p.cpf, ''), v_cpf),
      full_name = COALESCE(NULLIF(r.full_name, ''), NULLIF(p.full_name, ''), NULLIF(v_admin_name, ''), p.full_name),
      social_name = COALESCE(NULLIF(r.social_name, ''), p.social_name),
      phone = COALESCE(NULLIF(r.whatsapp, ''), p.phone),
      unit = COALESCE(NULLIF(r.kit_unit, ''), p.unit),
      avatar_url = COALESCE(NULLIF(r.photo_url, ''), p.avatar_url),
      volunteer_credential = COALESCE(NULLIF(v_credential, ''), p.volunteer_credential),
      updated_at = now()
  WHERE p.cpf = v_cpf
     OR (r.email IS NOT NULL AND lower(p.email) = lower(r.email));

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_profiles_public_trigger ON public.profiles;
CREATE TRIGGER sync_profiles_public_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profiles_public();

DROP TRIGGER IF EXISTS sync_profiles_from_admin_volunteers_trigger ON public.admin_volunteers;
CREATE TRIGGER sync_profiles_from_admin_volunteers_trigger
AFTER INSERT OR UPDATE OF full_name, credencial ON public.admin_volunteers
FOR EACH ROW EXECUTE FUNCTION public.sync_profiles_from_volunteer_sources();

DROP TRIGGER IF EXISTS sync_profiles_from_volunteer_registrations_trigger ON public.volunteer_registrations;
CREATE TRIGGER sync_profiles_from_volunteer_registrations_trigger
AFTER INSERT OR UPDATE OF full_name, social_name, whatsapp, email, cpf, kit_unit, photo_url ON public.volunteer_registrations
FOR EACH ROW EXECUTE FUNCTION public.sync_profiles_from_volunteer_sources();

CREATE OR REPLACE FUNCTION public.grant_voluntagram_credential(_registration_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r public.volunteer_registrations%ROWTYPE;
  v_cred text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas admins';
  END IF;

  SELECT * INTO r FROM public.volunteer_registrations WHERE id = _registration_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cadastro não encontrado'; END IF;

  SELECT credencial INTO v_cred FROM public.admin_volunteers WHERE cpf = r.cpf;
  IF v_cred IS NULL THEN
    v_cred := public.next_credential();
  END IF;

  INSERT INTO public.admin_volunteers (cpf, full_name, credencial, source, created_by)
  VALUES (r.cpf, r.full_name, v_cred, 'auto', auth.uid())
  ON CONFLICT (cpf) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      credencial = COALESCE(public.admin_volunteers.credencial, EXCLUDED.credencial),
      updated_at = now()
  RETURNING credencial INTO v_cred;

  UPDATE public.profiles p
  SET cpf = COALESCE(NULLIF(p.cpf, ''), r.cpf),
      full_name = COALESCE(NULLIF(r.full_name, ''), p.full_name),
      social_name = COALESCE(NULLIF(r.social_name, ''), p.social_name),
      phone = COALESCE(NULLIF(r.whatsapp, ''), p.phone),
      unit = COALESCE(NULLIF(r.kit_unit, ''), p.unit),
      avatar_url = COALESCE(NULLIF(r.photo_url, ''), p.avatar_url),
      volunteer_credential = v_cred,
      updated_at = now()
  WHERE p.cpf = r.cpf OR lower(p.email) = lower(r.email);

  RETURN v_cred;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.sync_profile_from_registration(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.grant_voluntagram_credential(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_profiles_from_volunteer_sources() TO service_role;
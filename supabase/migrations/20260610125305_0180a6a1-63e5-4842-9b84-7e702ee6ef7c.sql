CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=off) AS
SELECT id, full_name, social_name, avatar_url, bio,
       volunteer_credential, volunteer_level, ggl_id, unit, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;
REVOKE SELECT ON public.profiles_public FROM anon;

CREATE OR REPLACE FUNCTION public.sync_profile_from_registration(_user_id uuid DEFAULT auth.uid())
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  r public.volunteer_registrations%ROWTYPE;
  av public.admin_volunteers%ROWTYPE;
  patch jsonb := '{}'::jsonb;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  IF auth.uid() IS DISTINCT FROM _user_id AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF p.cpf IS NOT NULL THEN
    SELECT * INTO r
    FROM public.volunteer_registrations
    WHERE cpf = p.cpf
    ORDER BY created_at DESC
    LIMIT 1;
  ELSIF p.email IS NOT NULL THEN
    SELECT * INTO r
    FROM public.volunteer_registrations
    WHERE lower(email) = lower(p.email)
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF FOUND THEN
    IF p.cpf IS NULL AND r.cpf IS NOT NULL THEN patch := patch || jsonb_build_object('cpf', r.cpf); END IF;
    IF (p.full_name IS NULL OR trim(p.full_name) = '') AND r.full_name IS NOT NULL THEN patch := patch || jsonb_build_object('full_name', r.full_name); END IF;
    IF (p.phone IS NULL OR trim(p.phone) = '') AND r.whatsapp IS NOT NULL THEN patch := patch || jsonb_build_object('phone', r.whatsapp); END IF;
    IF (p.unit IS NULL OR trim(p.unit) = '') AND r.kit_unit IS NOT NULL THEN patch := patch || jsonb_build_object('unit', r.kit_unit); END IF;
    IF (p.avatar_url IS NULL OR trim(p.avatar_url) = '') AND r.photo_url IS NOT NULL THEN patch := patch || jsonb_build_object('avatar_url', r.photo_url); END IF;
  END IF;

  SELECT * INTO av
  FROM public.admin_volunteers
  WHERE cpf = COALESCE((patch->>'cpf'), p.cpf, r.cpf)
  LIMIT 1;

  IF FOUND AND av.credencial IS NOT NULL AND (p.volunteer_credential IS NULL OR trim(p.volunteer_credential) = '') THEN
    patch := patch || jsonb_build_object('volunteer_credential', av.credencial);
  END IF;

  IF patch <> '{}'::jsonb THEN
    UPDATE public.profiles
    SET cpf = COALESCE(patch->>'cpf', cpf),
        full_name = COALESCE(patch->>'full_name', full_name),
        phone = COALESCE(patch->>'phone', phone),
        unit = COALESCE(patch->>'unit', unit),
        avatar_url = COALESCE(patch->>'avatar_url', avatar_url),
        volunteer_credential = COALESCE(patch->>'volunteer_credential', volunteer_credential),
        updated_at = now()
    WHERE id = _user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_profile_from_registration(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.grant_voluntagram_credential(_registration_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r public.volunteer_registrations%ROWTYPE;
  v_cred text;
  v_user_id uuid;
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

  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE cpf = r.cpf OR lower(email) = lower(r.email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET cpf = COALESCE(cpf, r.cpf),
        full_name = COALESCE(NULLIF(full_name, ''), r.full_name),
        phone = COALESCE(NULLIF(phone, ''), r.whatsapp),
        unit = COALESCE(NULLIF(unit, ''), r.kit_unit),
        avatar_url = COALESCE(NULLIF(avatar_url, ''), r.photo_url),
        volunteer_credential = v_cred,
        updated_at = now()
    WHERE id = v_user_id;
  END IF;

  RETURN v_cred;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_voluntagram_credential(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_authorized_volunteer(_cpf text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cpf text := regexp_replace(_cpf, '\D', '', 'g');
  v_user_ids uuid[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas admins podem excluir voluntários';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) INTO v_user_ids
  FROM public.profiles
  WHERE cpf = v_cpf;

  DELETE FROM public.post_likes WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.post_comments WHERE user_id = ANY(v_user_ids) OR post_id IN (SELECT id FROM public.feed_posts WHERE user_id = ANY(v_user_ids));
  DELETE FROM public.post_views WHERE user_id = ANY(v_user_ids) OR post_id IN (SELECT id FROM public.feed_posts WHERE user_id = ANY(v_user_ids));
  DELETE FROM public.feed_posts WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.stories WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.motivational_messages WHERE sender_id = ANY(v_user_ids) OR recipient_id = ANY(v_user_ids);
  DELETE FROM public.volunteer_messages WHERE sender_id = ANY(v_user_ids) OR recipient_id = ANY(v_user_ids);
  DELETE FROM public.push_subscriptions WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.volunteer_actions WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.ggl_members WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.user_roles WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.profiles WHERE id = ANY(v_user_ids);

  DELETE FROM public.voluntagram_access_requests
  WHERE registration_id IN (SELECT id FROM public.volunteer_registrations WHERE cpf = v_cpf);
  DELETE FROM public.magna_enrollments
  WHERE registration_id IN (SELECT id FROM public.volunteer_registrations WHERE cpf = v_cpf);
  DELETE FROM public.welcome_meeting_bookings
  WHERE registration_id IN (SELECT id FROM public.volunteer_registrations WHERE cpf = v_cpf);
  DELETE FROM public.volunteer_registrations WHERE cpf = v_cpf;
  DELETE FROM public.admin_volunteers WHERE cpf = v_cpf;

  DELETE FROM auth.users WHERE id = ANY(v_user_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_authorized_volunteer(text) TO authenticated;

UPDATE public.profiles p
SET avatar_url = COALESCE(NULLIF(p.avatar_url, ''), r.photo_url),
    volunteer_credential = COALESCE(NULLIF(p.volunteer_credential, ''), av.credencial),
    full_name = COALESCE(NULLIF(p.full_name, ''), r.full_name),
    phone = COALESCE(NULLIF(p.phone, ''), r.whatsapp),
    unit = COALESCE(NULLIF(p.unit, ''), r.kit_unit),
    updated_at = now()
FROM public.volunteer_registrations r
LEFT JOIN public.admin_volunteers av ON av.cpf = r.cpf
WHERE p.cpf = r.cpf
  AND (
    (p.avatar_url IS NULL OR p.avatar_url = '') OR
    (p.volunteer_credential IS NULL OR p.volunteer_credential = '') OR
    (p.full_name IS NULL OR p.full_name = '') OR
    (p.phone IS NULL OR p.phone = '') OR
    (p.unit IS NULL OR p.unit = '')
  );
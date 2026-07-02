-- Remove auto-add to authorized base on registration
DROP TRIGGER IF EXISTS trg_auto_add_authorized_base ON public.volunteer_registrations;

-- Update grant_voluntagram_credential to include phone, profession and ggl_id when adding to authorized base
CREATE OR REPLACE FUNCTION public.grant_voluntagram_credential(_registration_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r public.volunteer_registrations%ROWTYPE;
  v_cred text;
  v_ggl_id uuid;
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

  SELECT id INTO v_ggl_id
  FROM public.ggl_groups
  WHERE lower(btrim(unit_name)) = lower(btrim(COALESCE(r.kit_unit, '')))
  LIMIT 1;

  INSERT INTO public.admin_volunteers (cpf, full_name, credencial, phone, profession, ggl_id, source, created_by)
  VALUES (r.cpf, r.full_name, v_cred, r.whatsapp, r.profession, v_ggl_id, 'voluntagram_grant', auth.uid())
  ON CONFLICT (cpf) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      credencial = COALESCE(public.admin_volunteers.credencial, EXCLUDED.credencial),
      phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.admin_volunteers.phone),
      profession = COALESCE(NULLIF(EXCLUDED.profession, ''), public.admin_volunteers.profession),
      ggl_id = COALESCE(EXCLUDED.ggl_id, public.admin_volunteers.ggl_id),
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
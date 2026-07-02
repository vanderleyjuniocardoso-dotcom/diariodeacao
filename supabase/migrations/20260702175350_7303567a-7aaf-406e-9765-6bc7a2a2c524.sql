CREATE OR REPLACE FUNCTION public.auto_add_to_authorized_base()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cpf text := NULLIF(regexp_replace(COALESCE(NEW.cpf, ''), '\D', '', 'g'), '');
  v_cred text;
  v_ggl_id uuid;
BEGIN
  IF v_cpf IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT credencial INTO v_cred
  FROM public.admin_volunteers
  WHERE cpf = v_cpf;

  IF v_cred IS NULL THEN
    v_cred := public.next_credential();
  END IF;

  SELECT id INTO v_ggl_id
  FROM public.ggl_groups
  WHERE lower(btrim(unit_name)) = lower(btrim(COALESCE(NEW.kit_unit, '')))
  LIMIT 1;

  INSERT INTO public.admin_volunteers (cpf, full_name, credencial, phone, profession, ggl_id, source)
  VALUES (v_cpf, NEW.full_name, v_cred, NEW.whatsapp, NEW.profession, v_ggl_id, 'auto_registration')
  ON CONFLICT (cpf) DO UPDATE
  SET full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.admin_volunteers.full_name),
      phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.admin_volunteers.phone),
      profession = COALESCE(NULLIF(EXCLUDED.profession, ''), public.admin_volunteers.profession),
      ggl_id = COALESCE(EXCLUDED.ggl_id, public.admin_volunteers.ggl_id),
      credencial = COALESCE(public.admin_volunteers.credencial, EXCLUDED.credencial),
      updated_at = now();

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_add_authorized_base ON public.volunteer_registrations;
CREATE TRIGGER trg_auto_add_authorized_base
AFTER INSERT OR UPDATE OF cpf, full_name, whatsapp, profession, kit_unit
ON public.volunteer_registrations
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_to_authorized_base();
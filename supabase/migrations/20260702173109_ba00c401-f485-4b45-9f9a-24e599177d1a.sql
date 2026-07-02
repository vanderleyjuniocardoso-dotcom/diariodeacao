
CREATE OR REPLACE FUNCTION public.auto_add_to_authorized_base()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cred text;
BEGIN
  IF NEW.cpf IS NULL OR NEW.cpf = '' THEN
    RETURN NEW;
  END IF;

  SELECT credencial INTO v_cred FROM public.admin_volunteers WHERE cpf = NEW.cpf;
  IF v_cred IS NULL THEN
    v_cred := public.next_credential();
  END IF;

  INSERT INTO public.admin_volunteers (cpf, full_name, credencial, phone, profession, source)
  VALUES (NEW.cpf, NEW.full_name, v_cred, NEW.whatsapp, NEW.profession, 'auto_registration')
  ON CONFLICT (cpf) DO UPDATE
  SET full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.admin_volunteers.full_name),
      phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.admin_volunteers.phone),
      profession = COALESCE(NULLIF(EXCLUDED.profession, ''), public.admin_volunteers.profession),
      credencial = COALESCE(public.admin_volunteers.credencial, EXCLUDED.credencial),
      updated_at = now();

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_add_authorized_base ON public.volunteer_registrations;
CREATE TRIGGER trg_auto_add_authorized_base
AFTER INSERT OR UPDATE OF full_name, whatsapp, profession, cpf
ON public.volunteer_registrations
FOR EACH ROW EXECUTE FUNCTION public.auto_add_to_authorized_base();

-- Backfill: preenche phone/profession na base a partir dos cadastros existentes
UPDATE public.admin_volunteers av
SET phone = COALESCE(NULLIF(av.phone, ''), vr.whatsapp),
    profession = COALESCE(NULLIF(av.profession, ''), vr.profession),
    full_name = COALESCE(NULLIF(av.full_name, ''), vr.full_name),
    updated_at = now()
FROM public.volunteer_registrations vr
WHERE vr.cpf = av.cpf
  AND (
    (av.phone IS NULL OR av.phone = '') AND vr.whatsapp IS NOT NULL
    OR (av.profession IS NULL OR av.profession = '') AND vr.profession IS NOT NULL
  );

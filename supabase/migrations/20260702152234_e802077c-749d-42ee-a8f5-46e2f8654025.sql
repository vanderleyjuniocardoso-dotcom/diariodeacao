
CREATE OR REPLACE FUNCTION public.auto_add_to_authorized_base()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.admin_volunteers (cpf, full_name, credencial, phone, source)
  VALUES (NEW.cpf, NEW.full_name, v_cred, NEW.whatsapp, 'auto_registration')
  ON CONFLICT (cpf) DO UPDATE
  SET full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.admin_volunteers.full_name),
      phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.admin_volunteers.phone),
      credencial = COALESCE(public.admin_volunteers.credencial, EXCLUDED.credencial),
      updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_add_authorized_base ON public.volunteer_registrations;
CREATE TRIGGER trg_auto_add_authorized_base
AFTER INSERT ON public.volunteer_registrations
FOR EACH ROW EXECUTE FUNCTION public.auto_add_to_authorized_base();


CREATE OR REPLACE FUNCTION public.approve_registration(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas admins podem aprovar';
  END IF;
  UPDATE public.volunteer_registrations
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_voluntagram_credential(_registration_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    INSERT INTO public.admin_volunteers (cpf, full_name, credencial, source, created_by)
    VALUES (r.cpf, r.full_name, v_cred, 'auto', auth.uid())
    ON CONFLICT (cpf) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = now()
    RETURNING credencial INTO v_cred;
  END IF;

  RETURN v_cred;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_voluntagram_credential(uuid) TO authenticated;

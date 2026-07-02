
DROP FUNCTION IF EXISTS public.check_cpf(text);

CREATE OR REPLACE FUNCTION public.check_cpf(_cpf text)
RETURNS TABLE(
  found boolean,
  full_name text,
  has_account boolean,
  has_registration_pending boolean,
  has_registration_active boolean,
  registration_id uuid,
  registration_status text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text;
  v_account boolean;
  v_reg_id uuid;
  v_status text;
BEGIN
  SELECT av.full_name INTO v_name FROM public.admin_volunteers av WHERE av.cpf = _cpf;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE cpf = _cpf) INTO v_account;

  SELECT vr.id, vr.status::text
    INTO v_reg_id, v_status
  FROM public.volunteer_registrations vr
  WHERE vr.cpf = _cpf
  ORDER BY CASE WHEN vr.status::text IN ('pending','approved') THEN 0 ELSE 1 END,
           vr.created_at DESC
  LIMIT 1;

  RETURN QUERY SELECT
    (v_name IS NOT NULL),
    v_name,
    v_account,
    (v_status = 'pending'),
    (v_status IN ('pending','approved')),
    v_reg_id,
    v_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_cpf(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.link_volunteer_ggl_by_name(_ggl_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cpf text;
  v_gid uuid;
BEGIN
  IF v_uid IS NULL OR _ggl_name IS NULL OR btrim(_ggl_name) = '' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_gid
  FROM public.ggl_groups
  WHERE lower(btrim(unit_name)) = lower(btrim(_ggl_name))
  LIMIT 1;

  IF v_gid IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.profiles
     SET ggl_id = v_gid, updated_at = now()
   WHERE id = v_uid
     AND (ggl_id IS DISTINCT FROM v_gid);

  SELECT cpf INTO v_cpf FROM public.profiles WHERE id = v_uid;
  IF v_cpf IS NOT NULL AND v_cpf <> '' THEN
    UPDATE public.admin_volunteers
       SET ggl_id = v_gid, updated_at = now()
     WHERE cpf = v_cpf
       AND (ggl_id IS DISTINCT FROM v_gid);
  END IF;

  RETURN v_gid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_volunteer_ggl_by_name(text) TO authenticated;

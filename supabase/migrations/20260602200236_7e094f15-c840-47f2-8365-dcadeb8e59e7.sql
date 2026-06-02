
DROP FUNCTION IF EXISTS public.check_cpf(text);
CREATE FUNCTION public.check_cpf(_cpf text)
RETURNS TABLE(found boolean, full_name text, has_account boolean, has_registration_pending boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_account boolean;
  v_pending boolean;
BEGIN
  SELECT av.full_name INTO v_name FROM public.admin_volunteers av WHERE av.cpf = _cpf;
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE cpf = _cpf) INTO v_account;
  SELECT EXISTS(SELECT 1 FROM public.volunteer_registrations WHERE cpf = _cpf AND status = 'pending') INTO v_pending;
  RETURN QUERY SELECT (v_name IS NOT NULL), v_name, v_account, v_pending;
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_cpf(text) TO anon, authenticated;

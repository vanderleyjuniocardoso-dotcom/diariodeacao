CREATE OR REPLACE FUNCTION public.submit_volunteer_registration(
  _cpf text,
  _full_name text,
  _social_name text,
  _whatsapp text,
  _email text,
  _gender text,
  _birth_date date,
  _rg text,
  _marital_status text,
  _city text,
  _neighborhood text,
  _address text,
  _education text,
  _area_of_work text,
  _profession text,
  _works_at_cejam boolean,
  _cejam_unit text,
  _how_found_program text,
  _shirt_size text,
  _kit_unit text,
  _agreed_terms boolean,
  _photo_url text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF coalesce(_agreed_terms, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'É necessário aceitar os termos';
  END IF;

  INSERT INTO public.volunteer_registrations (
    status,
    cpf,
    full_name,
    social_name,
    whatsapp,
    email,
    gender,
    birth_date,
    rg,
    marital_status,
    city,
    neighborhood,
    address,
    education,
    area_of_work,
    profession,
    works_at_cejam,
    cejam_unit,
    how_found_program,
    shirt_size,
    kit_unit,
    agreed_terms,
    photo_url
  ) VALUES (
    'pending'::public.registration_status,
    regexp_replace(_cpf, '\D', '', 'g'),
    nullif(trim(_full_name), ''),
    nullif(trim(_social_name), ''),
    regexp_replace(_whatsapp, '\D', '', 'g'),
    lower(nullif(trim(_email), '')),
    nullif(trim(_gender), ''),
    _birth_date,
    regexp_replace(_rg, '\D', '', 'g'),
    nullif(trim(_marital_status), ''),
    nullif(trim(_city), ''),
    nullif(trim(_neighborhood), ''),
    nullif(trim(_address), ''),
    nullif(trim(_education), ''),
    nullif(trim(_area_of_work), ''),
    nullif(trim(_profession), ''),
    coalesce(_works_at_cejam, false),
    CASE WHEN coalesce(_works_at_cejam, false) THEN nullif(trim(_cejam_unit), '') ELSE NULL END,
    nullif(trim(_how_found_program), ''),
    nullif(trim(_shirt_size), ''),
    nullif(trim(_kit_unit), ''),
    true,
    nullif(trim(_photo_url), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_volunteer_registration(text, text, text, text, text, text, date, text, text, text, text, text, text, text, text, boolean, text, text, text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_volunteer_registration(text, text, text, text, text, text, date, text, text, text, text, text, text, text, text, boolean, text, text, text, text, boolean, text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can submit registration" ON public.volunteer_registrations;

CREATE POLICY "Only backend function can submit registrations"
ON public.volunteer_registrations
FOR INSERT
TO service_role
WITH CHECK (true);
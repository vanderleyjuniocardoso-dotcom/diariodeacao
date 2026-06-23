CREATE OR REPLACE FUNCTION public.get_my_ggl_volunteers()
RETURNS TABLE (
  cpf text,
  full_name text,
  credencial text,
  phone text,
  profession text,
  ggl_id uuid,
  profile_id uuid,
  effective_phone text,
  effective_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_group AS (
    SELECT public.get_my_ggl_admin_group() AS id
  ), admin_linked AS (
    SELECT
      av.cpf,
      COALESCE(NULLIF(p.full_name, ''), av.full_name) AS full_name,
      av.credencial,
      COALESCE(NULLIF(p.phone, ''), av.phone) AS phone,
      av.profession,
      COALESCE(av.ggl_id, p.ggl_id) AS ggl_id,
      p.id AS profile_id,
      COALESCE(NULLIF(p.phone, ''), av.phone) AS effective_phone,
      COALESCE(NULLIF(p.full_name, ''), av.full_name) AS effective_name
    FROM public.admin_volunteers av
    LEFT JOIN public.profiles p ON p.cpf = av.cpf
    JOIN my_group mg ON COALESCE(av.ggl_id, p.ggl_id) = mg.id
  ), profile_only AS (
    SELECT
      p.cpf,
      p.full_name,
      p.volunteer_credential AS credencial,
      p.phone,
      NULL::text AS profession,
      p.ggl_id,
      p.id AS profile_id,
      p.phone AS effective_phone,
      p.full_name AS effective_name
    FROM public.profiles p
    JOIN my_group mg ON p.ggl_id = mg.id
    WHERE p.cpf IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.admin_volunteers av WHERE av.cpf = p.cpf)
  )
  SELECT * FROM admin_linked
  UNION
  SELECT * FROM profile_only
  ORDER BY effective_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_ggl_volunteers() TO authenticated;
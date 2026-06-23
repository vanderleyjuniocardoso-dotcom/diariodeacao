DROP VIEW IF EXISTS public.ggl_volunteers_view;
CREATE VIEW public.ggl_volunteers_view
WITH (security_invoker = on) AS
SELECT
  av.cpf,
  COALESCE(NULLIF(p.full_name, ''), av.full_name) AS full_name,
  av.credencial,
  COALESCE(p.phone, av.phone) AS phone,
  av.profession,
  COALESCE(av.ggl_id, p.ggl_id) AS ggl_id,
  p.id AS profile_id,
  COALESCE(p.phone, av.phone) AS effective_phone,
  COALESCE(NULLIF(p.full_name, ''), av.full_name) AS effective_name
FROM public.admin_volunteers av
LEFT JOIN public.profiles p ON p.cpf = av.cpf
WHERE COALESCE(av.ggl_id, p.ggl_id) IS NOT NULL

UNION

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
WHERE p.ggl_id IS NOT NULL
  AND (p.cpf IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_volunteers av WHERE av.cpf = p.cpf));

GRANT SELECT ON public.ggl_volunteers_view TO authenticated;
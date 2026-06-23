CREATE OR REPLACE VIEW public.ggl_volunteers_view
WITH (security_invoker = on) AS
SELECT
  av.cpf,
  av.full_name,
  av.credencial,
  av.phone,
  av.profession,
  COALESCE(av.ggl_id, p.ggl_id) AS ggl_id,
  p.id AS profile_id,
  COALESCE(p.phone, av.phone) AS effective_phone,
  COALESCE(NULLIF(p.full_name, ''), av.full_name) AS effective_name
FROM public.admin_volunteers av
LEFT JOIN public.profiles p ON p.cpf = av.cpf;

GRANT SELECT ON public.ggl_volunteers_view TO authenticated;
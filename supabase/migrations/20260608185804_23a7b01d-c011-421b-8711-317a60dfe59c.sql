WITH cand AS (
  SELECT p.id AS profile_id, vr.cpf,
         ROW_NUMBER() OVER (PARTITION BY vr.cpf ORDER BY p.created_at DESC) AS rn
  FROM public.profiles p
  JOIN (
    SELECT DISTINCT ON (lower(email)) lower(email) AS email, cpf
    FROM public.volunteer_registrations
    WHERE email IS NOT NULL AND cpf IS NOT NULL
    ORDER BY lower(email), created_at DESC
  ) vr ON lower(p.email) = vr.email
  WHERE (p.cpf IS NULL OR p.cpf = '')
    AND NOT EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.cpf = vr.cpf)
)
UPDATE public.profiles p SET cpf = c.cpf
FROM cand c WHERE c.profile_id = p.id AND c.rn = 1;

UPDATE public.profiles p SET volunteer_credential = av.credencial
FROM public.admin_volunteers av
WHERE (p.volunteer_credential IS NULL OR p.volunteer_credential = '')
  AND p.cpf = av.cpf AND av.credencial IS NOT NULL;

UPDATE public.profiles p SET avatar_url = vr.photo_url
FROM (SELECT DISTINCT ON (cpf) cpf, photo_url FROM public.volunteer_registrations WHERE photo_url IS NOT NULL ORDER BY cpf, created_at DESC) vr
WHERE (p.avatar_url IS NULL OR p.avatar_url = '') AND p.cpf = vr.cpf;
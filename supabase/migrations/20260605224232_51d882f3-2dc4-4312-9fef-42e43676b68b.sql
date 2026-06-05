
-- ============ PROFILES ============
DROP POLICY IF EXISTS "Authenticated can view volunteers basic" ON public.profiles;

-- View pública sem campos sensíveis
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT id, full_name, social_name, avatar_url, bio,
       volunteer_credential, volunteer_level, ggl_id, unit, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- Função para obter o próprio perfil completo (inclui campos sensíveis)
CREATE OR REPLACE FUNCTION public.get_own_profile()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT * FROM public.profiles WHERE id = auth.uid() $$;

-- Função para obter perfil público de um voluntário
CREATE OR REPLACE FUNCTION public.get_public_profile(_id uuid)
RETURNS TABLE(id uuid, full_name text, social_name text, avatar_url text, bio text,
              volunteer_credential text, volunteer_level smallint, ggl_id uuid, unit text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id, full_name, social_name, avatar_url, bio, volunteer_credential, volunteer_level, ggl_id, unit
      FROM public.profiles WHERE id = _id $$;

CREATE OR REPLACE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE(id uuid, full_name text, social_name text, avatar_url text, bio text,
              volunteer_credential text, volunteer_level smallint, ggl_id uuid, unit text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id, full_name, social_name, avatar_url, bio, volunteer_credential, volunteer_level, ggl_id, unit
      FROM public.profiles WHERE id = ANY(_ids) $$;

GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated, anon;

-- ============ WELCOME_MEETING_BOOKINGS ============
DROP POLICY IF EXISTS "Anyone read bookings basic" ON public.welcome_meeting_bookings;
REVOKE SELECT ON public.welcome_meeting_bookings FROM anon;

CREATE OR REPLACE FUNCTION public.get_my_booking(_registration_id uuid)
RETURNS TABLE(id uuid, slot_id uuid, attended boolean, registration_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id, slot_id, attended, registration_id
      FROM public.welcome_meeting_bookings
      WHERE registration_id = _registration_id
      ORDER BY created_at DESC LIMIT 1 $$;

GRANT EXECUTE ON FUNCTION public.get_my_booking(uuid) TO authenticated, anon;

-- ============ VOLUNTAGRAM_ACCESS_REQUESTS ============
DROP POLICY IF EXISTS "Anyone read request" ON public.voluntagram_access_requests;
REVOKE SELECT ON public.voluntagram_access_requests FROM anon;

CREATE POLICY "Admins read access requests" ON public.voluntagram_access_requests
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_my_access_request(_enrollment_id uuid)
RETURNS TABLE(id uuid, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id, status FROM public.voluntagram_access_requests
      WHERE enrollment_id = _enrollment_id
      ORDER BY created_at DESC LIMIT 1 $$;

GRANT EXECUTE ON FUNCTION public.get_my_access_request(uuid) TO authenticated, anon;

-- ============ MAGNA_ENROLLMENTS ============
DROP POLICY IF EXISTS "Anyone read enrollments" ON public.magna_enrollments;
REVOKE SELECT ON public.magna_enrollments FROM anon;

CREATE POLICY "Admins read enrollments" ON public.magna_enrollments
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_my_enrollment(_registration_id uuid)
RETURNS TABLE(id uuid, class_code text, started boolean, progress integer, video_watched boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id, class_code, started, progress, video_watched
      FROM public.magna_enrollments
      WHERE registration_id = _registration_id
      ORDER BY created_at DESC LIMIT 1 $$;

GRANT EXECUTE ON FUNCTION public.get_my_enrollment(uuid) TO authenticated, anon;

-- ============ STORAGE: action-photos delete policy ============
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

CREATE POLICY "Users can delete own action photos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'action-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

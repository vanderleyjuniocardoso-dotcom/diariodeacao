
-- Revoke anon/public execute on security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- Fix storage listing: drop broad SELECT, add scoped one
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
CREATE POLICY "Anyone can view action photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'action-photos' AND (storage.foldername(name))[1] IS NOT NULL);

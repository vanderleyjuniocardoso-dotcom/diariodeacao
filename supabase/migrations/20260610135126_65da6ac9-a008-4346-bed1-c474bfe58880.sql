-- Tighten action-photos upload policy to folder ownership
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
CREATE POLICY "Users upload their own action photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'action-photos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Remove sensitive tables from realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='magna_enrollments') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.magna_enrollments';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='welcome_meeting_bookings') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.welcome_meeting_bookings';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='profiles') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='voluntagram_access_requests') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.voluntagram_access_requests';
  END IF;
END $$;
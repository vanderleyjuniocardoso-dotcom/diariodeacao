
CREATE POLICY "Anon can upload volunteer registration photo"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'volunteer-registrations');

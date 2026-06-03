
CREATE POLICY "Anyone read integration video"
ON storage.objects FOR SELECT
USING (bucket_id = 'integration-video');

CREATE POLICY "Admins upload integration video"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'integration-video' AND has_role(auth.uid(),'admin'));

CREATE POLICY "Admins update integration video"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'integration-video' AND has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete integration video"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'integration-video' AND has_role(auth.uid(),'admin'));

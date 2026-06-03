DROP POLICY IF EXISTS "Anyone can submit registration" ON public.volunteer_registrations;
CREATE POLICY "Anyone can submit registration"
ON public.volunteer_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
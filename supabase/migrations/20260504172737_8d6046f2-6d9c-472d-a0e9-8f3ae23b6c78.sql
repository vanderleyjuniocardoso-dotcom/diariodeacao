ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS volunteer_level smallint NOT NULL DEFAULT 1;

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
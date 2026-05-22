CREATE TABLE public.admin_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view broadcasts"
ON public.admin_broadcasts FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Admins can insert broadcasts"
ON public.admin_broadcasts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = sender_id);

CREATE POLICY "Admins can update broadcasts"
ON public.admin_broadcasts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete broadcasts"
ON public.admin_broadcasts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_broadcasts;

ALTER TABLE public.volunteer_messages ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;
ALTER TABLE public.volunteer_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.volunteer_messages;

CREATE POLICY "Recipients can mark as read"
ON public.volunteer_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

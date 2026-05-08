CREATE TABLE public.volunteer_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteer_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send messages"
ON public.volunteer_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view received messages"
ON public.volunteer_messages FOR SELECT
TO authenticated
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can view sent messages"
ON public.volunteer_messages FOR SELECT
TO authenticated
USING (auth.uid() = sender_id);

CREATE INDEX idx_volunteer_messages_recipient ON public.volunteer_messages(recipient_id);

CREATE TABLE public.stories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_stories_user_expires ON public.stories(user_id, expires_at DESC);
CREATE INDEX idx_stories_expires ON public.stories(expires_at DESC);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active stories"
  ON public.stories FOR SELECT TO authenticated
  USING (expires_at > now());

CREATE POLICY "Users insert own stories"
  ON public.stories FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own stories"
  ON public.stories FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;

INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Stories images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'stories');

CREATE POLICY "Users upload own stories"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own story images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

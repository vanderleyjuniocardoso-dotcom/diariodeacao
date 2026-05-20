
-- Add bio to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

-- feed_posts
CREATE TABLE public.feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view posts" ON public.feed_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own posts" ON public.feed_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own posts" ON public.feed_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own posts" ON public.feed_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_feed_posts_created ON public.feed_posts (created_at DESC);
CREATE INDEX idx_feed_posts_user ON public.feed_posts (user_id);

-- post_likes
CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view likes" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own likes" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own likes" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_post_likes_post ON public.post_likes (post_id);

-- post_comments
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view comments" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own comments" ON public.post_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_post_comments_post ON public.post_comments (post_id, created_at);

-- motivational_messages
CREATE TABLE public.motivational_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL,
  preset text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
ALTER TABLE public.motivational_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender can view own motivations" ON public.motivational_messages FOR SELECT TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "Recipient can view received motivations" ON public.motivational_messages FOR SELECT TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "Users send motivations" ON public.motivational_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Recipient marks as read" ON public.motivational_messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

CREATE INDEX idx_motivational_recipient ON public.motivational_messages (recipient_id, created_at DESC);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.feed_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.motivational_messages;

ALTER TABLE public.feed_posts REPLICA IDENTITY FULL;
ALTER TABLE public.post_likes REPLICA IDENTITY FULL;
ALTER TABLE public.post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.motivational_messages REPLICA IDENTITY FULL;

-- Storage bucket for feed images
INSERT INTO storage.buckets (id, name, public) VALUES ('feed-posts', 'feed-posts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Feed images public read" ON storage.objects FOR SELECT USING (bucket_id = 'feed-posts');
CREATE POLICY "Users upload own feed images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'feed-posts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own feed images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'feed-posts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own feed images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'feed-posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- updated_at trigger reuse
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_feed_posts_updated BEFORE UPDATE ON public.feed_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

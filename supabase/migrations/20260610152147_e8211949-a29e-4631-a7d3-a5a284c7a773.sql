
CREATE TABLE public.story_likes (
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.story_likes TO authenticated;
GRANT ALL ON public.story_likes TO service_role;
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view story likes" ON public.story_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users like" ON public.story_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike own" ON public.story_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_story_likes_story ON public.story_likes(story_id);

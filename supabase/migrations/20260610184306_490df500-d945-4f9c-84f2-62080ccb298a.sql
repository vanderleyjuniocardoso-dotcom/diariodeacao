GRANT SELECT, INSERT, DELETE ON public.story_likes TO authenticated;
GRANT SELECT ON public.story_likes TO anon;
GRANT ALL ON public.story_likes TO service_role;
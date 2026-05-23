
-- post_views
CREATE TABLE public.post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view post views" ON public.post_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own views" ON public.post_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ggl_groups
CREATE TABLE public.ggl_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_name TEXT NOT NULL,
  cities TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.ggl_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view ggl groups" ON public.ggl_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert ggl groups" ON public.ggl_groups FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update ggl groups" ON public.ggl_groups FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete ggl groups" ON public.ggl_groups FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER ggl_groups_updated_at BEFORE UPDATE ON public.ggl_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ggl_members
CREATE TABLE public.ggl_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ggl_id UUID NOT NULL REFERENCES public.ggl_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.ggl_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view ggl members" ON public.ggl_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert ggl members" ON public.ggl_members FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update ggl members" ON public.ggl_members FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete ggl members" ON public.ggl_members FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- profiles.ggl_id
ALTER TABLE public.profiles ADD COLUMN ggl_id UUID REFERENCES public.ggl_groups(id) ON DELETE SET NULL;

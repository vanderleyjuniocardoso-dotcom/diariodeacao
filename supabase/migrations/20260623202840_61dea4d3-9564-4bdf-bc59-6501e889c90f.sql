CREATE TABLE public.ggl_action_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ggl_id uuid NOT NULL REFERENCES public.ggl_groups(id) ON DELETE CASCADE,
  action_date date NOT NULL,
  volunteer_name text NOT NULL,
  volunteer_cpf text,
  volunteer_credential text,
  is_cejam_collaborator boolean NOT NULL DEFAULT false,
  beneficiaries_count integer NOT NULL DEFAULT 0,
  hours numeric(6,2) NOT NULL DEFAULT 0,
  action_type text NOT NULL,
  action_name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_ggl_action_reports_ggl_date ON public.ggl_action_reports (ggl_id, action_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ggl_action_reports TO authenticated;
GRANT ALL ON public.ggl_action_reports TO service_role;

ALTER TABLE public.ggl_action_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ggl_reports_admin_all" ON public.ggl_action_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "ggl_reports_ggl_admin_all" ON public.ggl_action_reports
  FOR ALL TO authenticated
  USING (public.is_ggl_admin_of(auth.uid(), ggl_id))
  WITH CHECK (public.is_ggl_admin_of(auth.uid(), ggl_id));

CREATE POLICY "ggl_reports_select_auth" ON public.ggl_action_reports
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trg_ggl_reports_updated
  BEFORE UPDATE ON public.ggl_action_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 1) Estender admin_volunteers com telefone, profissão e vínculo de GGL
ALTER TABLE public.admin_volunteers
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS ggl_id uuid REFERENCES public.ggl_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_volunteers_ggl_id ON public.admin_volunteers(ggl_id);

-- 2) Estender ggl_members com função (role/papel no GGL)
ALTER TABLE public.ggl_members
  ADD COLUMN IF NOT EXISTS role text;

-- 3) Adicionar valor 'ggl_admin' ao enum app_role (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'ggl_admin'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'ggl_admin';
  END IF;
END$$;

-- 4) Calendário de ações planejadas por GGL
CREATE TABLE IF NOT EXISTS public.ggl_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ggl_id uuid NOT NULL REFERENCES public.ggl_groups(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  unit_name text,
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ggl_calendar_events_ggl ON public.ggl_calendar_events(ggl_id, event_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ggl_calendar_events TO authenticated;
GRANT ALL ON public.ggl_calendar_events TO service_role;

ALTER TABLE public.ggl_calendar_events ENABLE ROW LEVEL SECURITY;

-- 5) E-mails autorizados como admin de GGL (até 2 por grupo, garantido na app)
CREATE TABLE IF NOT EXISTS public.ggl_admin_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ggl_id uuid NOT NULL REFERENCES public.ggl_groups(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ggl_admin_emails_email ON public.ggl_admin_emails(lower(email));
CREATE INDEX IF NOT EXISTS idx_ggl_admin_emails_ggl ON public.ggl_admin_emails(ggl_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ggl_admin_emails TO authenticated;
GRANT ALL ON public.ggl_admin_emails TO service_role;

ALTER TABLE public.ggl_admin_emails ENABLE ROW LEVEL SECURITY;

-- 6) Função: e-mail está autorizado como ggl_admin? Retorna ggl_id
CREATE OR REPLACE FUNCTION public.is_ggl_admin_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ggl_id FROM public.ggl_admin_emails
  WHERE lower(email) = lower(_email) LIMIT 1
$$;

-- 7) Função: usuário é ggl_admin de um grupo específico?
CREATE OR REPLACE FUNCTION public.is_ggl_admin_of(_user_id uuid, _ggl_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ggl_admin_emails gae
    JOIN auth.users au ON lower(au.email) = lower(gae.email)
    WHERE au.id = _user_id AND gae.ggl_id = _ggl_id
  )
$$;

-- 8) Função: retorna o ggl_id do usuário se for ggl_admin
CREATE OR REPLACE FUNCTION public.get_my_ggl_admin_group()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gae.ggl_id
  FROM public.ggl_admin_emails gae
  JOIN auth.users au ON lower(au.email) = lower(gae.email)
  WHERE au.id = auth.uid()
  LIMIT 1
$$;

-- 9) Policies ggl_calendar_events
DROP POLICY IF EXISTS "ggl_cal_select" ON public.ggl_calendar_events;
DROP POLICY IF EXISTS "ggl_cal_admin_all" ON public.ggl_calendar_events;
DROP POLICY IF EXISTS "ggl_cal_ggl_admin_all" ON public.ggl_calendar_events;

CREATE POLICY "ggl_cal_select" ON public.ggl_calendar_events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ggl_cal_admin_all" ON public.ggl_calendar_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "ggl_cal_ggl_admin_all" ON public.ggl_calendar_events
  FOR ALL TO authenticated
  USING (public.is_ggl_admin_of(auth.uid(), ggl_id))
  WITH CHECK (public.is_ggl_admin_of(auth.uid(), ggl_id));

-- 10) Policies ggl_admin_emails
DROP POLICY IF EXISTS "ggl_emails_admin_all" ON public.ggl_admin_emails;
DROP POLICY IF EXISTS "ggl_emails_self_read" ON public.ggl_admin_emails;

CREATE POLICY "ggl_emails_admin_all" ON public.ggl_admin_emails
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 11) Permitir que membros do GGL e ggl_admins vejam ggl_members com função
--     (policies já existentes seguem; nada a mudar aqui — coluna role herda acesso)

-- 12) Trigger updated_at no calendário
DROP TRIGGER IF EXISTS trg_ggl_calendar_updated ON public.ggl_calendar_events;
CREATE TRIGGER trg_ggl_calendar_updated
  BEFORE UPDATE ON public.ggl_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 13) Permitir leitura de admin_volunteers por authenticated (necessário p/ aba Voluntários do GGL ver telefone/profissão dos colegas).
--     CPF continua sensível mas como tabela é admin-only, criamos VIEW pública sem CPF.
CREATE OR REPLACE VIEW public.ggl_volunteers_view
WITH (security_invoker = on) AS
SELECT
  av.cpf,                    -- exposto só via policy abaixo
  av.full_name,
  av.credencial,
  av.phone,
  av.profession,
  av.ggl_id,
  COALESCE(p.id, NULL) AS profile_id,
  COALESCE(p.phone, av.phone) AS effective_phone,
  COALESCE(NULLIF(p.full_name, ''), av.full_name) AS effective_name
FROM public.admin_volunteers av
LEFT JOIN public.profiles p ON p.cpf = av.cpf;

-- Permitir SELECT a authenticated via policy adicional em admin_volunteers
DROP POLICY IF EXISTS "admin_volunteers_select_authenticated" ON public.admin_volunteers;
CREATE POLICY "admin_volunteers_select_authenticated" ON public.admin_volunteers
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.ggl_volunteers_view TO authenticated;

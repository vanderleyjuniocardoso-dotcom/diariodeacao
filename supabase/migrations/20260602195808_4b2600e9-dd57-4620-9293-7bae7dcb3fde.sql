
-- Status enum for registrations
CREATE TYPE public.registration_status AS ENUM ('pending', 'approved', 'rejected');

-- 1) Base autorizada de voluntários
CREATE TABLE public.admin_volunteers (
  cpf text PRIMARY KEY,
  full_name text NOT NULL,
  credencial text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT cpf_11_digits CHECK (cpf ~ '^[0-9]{11}$')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_volunteers TO authenticated;
GRANT ALL ON public.admin_volunteers TO service_role;

ALTER TABLE public.admin_volunteers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage admin_volunteers select" ON public.admin_volunteers
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage admin_volunteers insert" ON public.admin_volunteers
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage admin_volunteers update" ON public.admin_volunteers
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage admin_volunteers delete" ON public.admin_volunteers
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_admin_volunteers_updated_at BEFORE UPDATE ON public.admin_volunteers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Cadastros completos pendentes
CREATE TABLE public.volunteer_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf text NOT NULL,
  full_name text NOT NULL,
  social_name text,
  whatsapp text NOT NULL,
  email text NOT NULL,
  gender text NOT NULL,
  birth_date date NOT NULL,
  rg text NOT NULL,
  marital_status text NOT NULL,
  city text NOT NULL,
  neighborhood text NOT NULL,
  address text NOT NULL,
  education text NOT NULL,
  area_of_work text NOT NULL,
  profession text NOT NULL,
  works_at_cejam boolean NOT NULL,
  cejam_unit text,
  how_found_program text NOT NULL,
  photo_url text,
  shirt_size text NOT NULL,
  kit_unit text NOT NULL,
  agreed_terms boolean NOT NULL DEFAULT false,
  status registration_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reg_cpf_11_digits CHECK (cpf ~ '^[0-9]{11}$')
);

CREATE INDEX volunteer_registrations_status_idx ON public.volunteer_registrations(status);
CREATE INDEX volunteer_registrations_cpf_idx ON public.volunteer_registrations(cpf);

GRANT INSERT ON public.volunteer_registrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_registrations TO authenticated;
GRANT ALL ON public.volunteer_registrations TO service_role;

ALTER TABLE public.volunteer_registrations ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode submeter um cadastro (anon ou authenticated)
CREATE POLICY "Anyone can submit registration" ON public.volunteer_registrations
  FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');

-- Apenas admins podem ler/editar
CREATE POLICY "Admins read registrations" ON public.volunteer_registrations
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update registrations" ON public.volunteer_registrations
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete registrations" ON public.volunteer_registrations
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_volunteer_registrations_updated_at BEFORE UPDATE ON public.volunteer_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Adicionar CPF e nome social ao profile
ALTER TABLE public.profiles
  ADD COLUMN cpf text UNIQUE,
  ADD COLUMN social_name text;

-- 4) RPC pública para validar CPF sem expor a tabela
CREATE OR REPLACE FUNCTION public.check_cpf(_cpf text)
RETURNS TABLE(found boolean, full_name text, has_registration_pending boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_pending boolean;
BEGIN
  SELECT av.full_name INTO v_name FROM public.admin_volunteers av WHERE av.cpf = _cpf;
  SELECT EXISTS(SELECT 1 FROM public.volunteer_registrations WHERE cpf = _cpf AND status = 'pending') INTO v_pending;
  RETURN QUERY SELECT (v_name IS NOT NULL), v_name, v_pending;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_cpf(text) TO anon, authenticated;

-- 5) RPC para admin aprovar cadastro
CREATE OR REPLACE FUNCTION public.approve_registration(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.volunteer_registrations%ROWTYPE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas admins podem aprovar';
  END IF;
  SELECT * INTO r FROM public.volunteer_registrations WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cadastro não encontrado'; END IF;

  INSERT INTO public.admin_volunteers (cpf, full_name, created_by)
  VALUES (r.cpf, r.full_name, auth.uid())
  ON CONFLICT (cpf) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = now();

  UPDATE public.volunteer_registrations
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_registration(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_registration(_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas admins podem rejeitar';
  END IF;
  UPDATE public.volunteer_registrations
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = _reason
  WHERE id = _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_registration(uuid, text) TO authenticated;

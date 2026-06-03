
-- ============ 1. admin_volunteers: source + credential auto ============
ALTER TABLE public.admin_volunteers ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

CREATE OR REPLACE FUNCTION public.next_credential()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last text;
  v_num bigint;
  v_digits int;
BEGIN
  SELECT credencial INTO v_last
  FROM public.admin_volunteers
  WHERE credencial ~ '^VOLUNT[0-9]+$'
  ORDER BY length(credencial) DESC, credencial DESC
  LIMIT 1;

  IF v_last IS NULL THEN
    RETURN 'VOLUNT01';
  END IF;

  v_digits := length(v_last) - 6; -- after 'VOLUNT'
  v_num := substring(v_last from 7)::bigint + 1;
  RETURN 'VOLUNT' || lpad(v_num::text, v_digits, '0');
END;
$$;

-- ============ 2. volunteer_registrations: welcome booking link ============
ALTER TABLE public.volunteer_registrations ADD COLUMN IF NOT EXISTS welcome_booking_id uuid;

-- ============ 3. welcome_meeting_slots ============
CREATE TABLE IF NOT EXISTS public.welcome_meeting_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month smallint NOT NULL CHECK (month BETWEEN 1 AND 12),
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  capacity int NOT NULL DEFAULT 50,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.welcome_meeting_slots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.welcome_meeting_slots TO authenticated;
GRANT ALL ON public.welcome_meeting_slots TO service_role;

ALTER TABLE public.welcome_meeting_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view slots" ON public.welcome_meeting_slots FOR SELECT USING (true);
CREATE POLICY "Admins insert slots" ON public.welcome_meeting_slots FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update slots" ON public.welcome_meeting_slots FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete slots" ON public.welcome_meeting_slots FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- ============ 4. welcome_meeting_bookings ============
CREATE TABLE IF NOT EXISTS public.welcome_meeting_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.welcome_meeting_slots(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES public.volunteer_registrations(id) ON DELETE CASCADE,
  volunteer_name text NOT NULL,
  volunteer_phone text,
  volunteer_email text,
  attended boolean NOT NULL DEFAULT false,
  checked_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wmb_slot ON public.welcome_meeting_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_wmb_reg ON public.welcome_meeting_bookings(registration_id);

GRANT SELECT, INSERT ON public.welcome_meeting_bookings TO anon, authenticated;
GRANT UPDATE, DELETE ON public.welcome_meeting_bookings TO authenticated;
GRANT ALL ON public.welcome_meeting_bookings TO service_role;

ALTER TABLE public.welcome_meeting_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone insert booking" ON public.welcome_meeting_bookings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read bookings" ON public.welcome_meeting_bookings FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Anyone read bookings basic" ON public.welcome_meeting_bookings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update bookings" ON public.welcome_meeting_bookings FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete bookings" ON public.welcome_meeting_bookings FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- ============ 5. magna_enrollments ============
CREATE TABLE IF NOT EXISTS public.magna_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_code text NOT NULL,
  registration_id uuid REFERENCES public.volunteer_registrations(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.welcome_meeting_bookings(id) ON DELETE SET NULL,
  volunteer_name text NOT NULL,
  volunteer_phone text,
  volunteer_email text,
  started boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  progress int NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  completed_at timestamptz,
  video_watched boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_magna_class ON public.magna_enrollments(class_code);
CREATE INDEX IF NOT EXISTS idx_magna_reg ON public.magna_enrollments(registration_id);

GRANT SELECT ON public.magna_enrollments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.magna_enrollments TO authenticated;
GRANT ALL ON public.magna_enrollments TO service_role;

ALTER TABLE public.magna_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read enrollments" ON public.magna_enrollments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins write enrollments" ON public.magna_enrollments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update enrollments" ON public.magna_enrollments FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete enrollments" ON public.magna_enrollments FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- ============ 6. voluntagram_access_requests ============
CREATE TABLE IF NOT EXISTS public.voluntagram_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES public.volunteer_registrations(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES public.magna_enrollments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

GRANT SELECT, INSERT ON public.voluntagram_access_requests TO anon, authenticated;
GRANT UPDATE, DELETE ON public.voluntagram_access_requests TO authenticated;
GRANT ALL ON public.voluntagram_access_requests TO service_role;

ALTER TABLE public.voluntagram_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone insert request" ON public.voluntagram_access_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone read request" ON public.voluntagram_access_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update request" ON public.voluntagram_access_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete request" ON public.voluntagram_access_requests FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- ============ 7. app_settings ============
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins write settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update settings" ON public.app_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete settings" ON public.app_settings FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- ============ 8. confirm_attendance ============
CREATE OR REPLACE FUNCTION public.confirm_attendance(_booking_id uuid, _attended boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b public.welcome_meeting_bookings%ROWTYPE;
  s public.welcome_meeting_slots%ROWTYPE;
  v_target_month int;
  v_class text;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Apenas admins'; END IF;
  SELECT * INTO b FROM public.welcome_meeting_bookings WHERE id = _booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking não encontrado'; END IF;

  UPDATE public.welcome_meeting_bookings
  SET attended = _attended, checked_at = CASE WHEN _attended THEN now() ELSE NULL END
  WHERE id = _booking_id;

  IF _attended THEN
    SELECT * INTO s FROM public.welcome_meeting_slots WHERE id = b.slot_id;
    v_target_month := s.month + 1;
    IF v_target_month > 12 THEN v_target_month := 12; END IF;
    v_class := 'T' || lpad(v_target_month::text, 2, '0') || '26';

    INSERT INTO public.magna_enrollments (class_code, registration_id, booking_id, volunteer_name, volunteer_phone)
    SELECT v_class, b.registration_id, b.id, b.volunteer_name, b.volunteer_phone
    WHERE NOT EXISTS (SELECT 1 FROM public.magna_enrollments WHERE booking_id = b.id);
  ELSE
    DELETE FROM public.magna_enrollments WHERE booking_id = b.id AND started = false;
  END IF;
END;
$$;

-- ============ 9. start_magna / set_magna_progress / set_video_watched ============
CREATE OR REPLACE FUNCTION public.start_magna(_enrollment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Apenas admins'; END IF;
  UPDATE public.magna_enrollments
  SET started = true, started_at = COALESCE(started_at, now()), updated_at = now()
  WHERE id = _enrollment_id;
END;$$;

CREATE OR REPLACE FUNCTION public.set_magna_progress(_enrollment_id uuid, _progress int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Apenas admins'; END IF;
  IF _progress < 0 OR _progress > 100 THEN RAISE EXCEPTION 'Progresso 0-100'; END IF;
  UPDATE public.magna_enrollments
  SET progress = _progress,
      completed_at = CASE WHEN _progress = 100 THEN COALESCE(completed_at, now()) ELSE NULL END,
      updated_at = now()
  WHERE id = _enrollment_id AND started = true;
END;$$;

CREATE OR REPLACE FUNCTION public.mark_video_watched(_enrollment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.magna_enrollments SET video_watched = true, updated_at = now() WHERE id = _enrollment_id;
END;$$;

-- ============ 10. request_voluntagram_access ============
CREATE OR REPLACE FUNCTION public.request_voluntagram_access(_enrollment_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  e public.magna_enrollments%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO e FROM public.magna_enrollments WHERE id = _enrollment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enrollment não encontrado'; END IF;
  INSERT INTO public.voluntagram_access_requests (registration_id, enrollment_id)
  VALUES (e.registration_id, e.id) RETURNING id INTO v_id;
  RETURN v_id;
END;$$;

-- ============ 11. approve_registration: agora gera credencial automática ============
CREATE OR REPLACE FUNCTION public.approve_registration(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.volunteer_registrations%ROWTYPE;
  v_cred text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Apenas admins podem aprovar'; END IF;
  SELECT * INTO r FROM public.volunteer_registrations WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cadastro não encontrado'; END IF;

  v_cred := public.next_credential();

  INSERT INTO public.admin_volunteers (cpf, full_name, credencial, source, created_by)
  VALUES (r.cpf, r.full_name, v_cred, 'auto', auth.uid())
  ON CONFLICT (cpf) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = now();

  UPDATE public.volunteer_registrations
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _id;
END;
$$;

-- ============ 12. enable realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.magna_enrollments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.welcome_meeting_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voluntagram_access_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;

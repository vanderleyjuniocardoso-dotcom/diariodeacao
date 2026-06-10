CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, cpf, unit)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cpf', ''), '\D', '', 'g'), ''),
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'unit', ''), '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_authorized_volunteer(_cpf text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cpf text := regexp_replace(_cpf, '\D', '', 'g');
  v_user_ids uuid[];
  v_names text[];
  v_phones text[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas admins podem excluir voluntários';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]),
         COALESCE(array_agg(full_name) FILTER (WHERE full_name IS NOT NULL), ARRAY[]::text[]),
         COALESCE(array_agg(phone) FILTER (WHERE phone IS NOT NULL), ARRAY[]::text[])
  INTO v_user_ids, v_names, v_phones
  FROM public.profiles
  WHERE cpf = v_cpf;

  DELETE FROM public.post_likes WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.post_comments WHERE user_id = ANY(v_user_ids) OR post_id IN (SELECT id FROM public.feed_posts WHERE user_id = ANY(v_user_ids));
  DELETE FROM public.post_views WHERE user_id = ANY(v_user_ids) OR post_id IN (SELECT id FROM public.feed_posts WHERE user_id = ANY(v_user_ids));
  DELETE FROM public.feed_posts WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.stories WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.motivational_messages WHERE sender_id = ANY(v_user_ids) OR recipient_id = ANY(v_user_ids);
  DELETE FROM public.volunteer_messages WHERE sender_id = ANY(v_user_ids) OR recipient_id = ANY(v_user_ids);
  DELETE FROM public.push_subscriptions WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.volunteer_actions WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.ggl_members WHERE name = ANY(v_names) OR phone = ANY(v_phones);
  DELETE FROM public.user_roles WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.profiles WHERE id = ANY(v_user_ids);

  DELETE FROM public.voluntagram_access_requests
  WHERE registration_id IN (SELECT id FROM public.volunteer_registrations WHERE cpf = v_cpf);
  DELETE FROM public.magna_enrollments
  WHERE registration_id IN (SELECT id FROM public.volunteer_registrations WHERE cpf = v_cpf);
  DELETE FROM public.welcome_meeting_bookings
  WHERE registration_id IN (SELECT id FROM public.volunteer_registrations WHERE cpf = v_cpf);
  DELETE FROM public.volunteer_registrations WHERE cpf = v_cpf;
  DELETE FROM public.admin_volunteers WHERE cpf = v_cpf;

  DELETE FROM auth.users WHERE id = ANY(v_user_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_authorized_volunteer(text) TO authenticated;
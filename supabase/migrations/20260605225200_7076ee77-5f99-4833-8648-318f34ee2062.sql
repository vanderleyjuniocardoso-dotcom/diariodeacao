
CREATE OR REPLACE FUNCTION public.create_booking(
  _slot_id uuid,
  _registration_id uuid,
  _volunteer_name text,
  _volunteer_phone text,
  _volunteer_email text
) RETURNS TABLE(id uuid, slot_id uuid, attended boolean, registration_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.welcome_meeting_bookings (slot_id, registration_id, volunteer_name, volunteer_phone, volunteer_email)
  VALUES (_slot_id, _registration_id, _volunteer_name, _volunteer_phone, _volunteer_email)
  RETURNING welcome_meeting_bookings.id INTO v_id;
  RETURN QUERY SELECT b.id, b.slot_id, b.attended, b.registration_id
    FROM public.welcome_meeting_bookings b WHERE b.id = v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking(uuid,uuid,text,text,text) TO anon, authenticated;

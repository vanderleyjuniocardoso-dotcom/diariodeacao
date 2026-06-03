GRANT INSERT ON public.volunteer_registrations TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.volunteer_registrations TO authenticated;
GRANT ALL ON public.volunteer_registrations TO service_role;

GRANT INSERT, SELECT ON public.welcome_meeting_bookings TO anon, authenticated;
GRANT UPDATE, DELETE ON public.welcome_meeting_bookings TO authenticated;
GRANT ALL ON public.welcome_meeting_bookings TO service_role;

GRANT SELECT ON public.welcome_meeting_slots TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.welcome_meeting_slots TO authenticated;
GRANT ALL ON public.welcome_meeting_slots TO service_role;

GRANT SELECT, INSERT ON public.voluntagram_access_requests TO anon, authenticated;
GRANT UPDATE, DELETE ON public.voluntagram_access_requests TO authenticated;
GRANT ALL ON public.voluntagram_access_requests TO service_role;

GRANT SELECT ON public.magna_enrollments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.magna_enrollments TO authenticated;
GRANT ALL ON public.magna_enrollments TO service_role;

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
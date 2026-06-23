REVOKE EXECUTE ON FUNCTION public.get_my_ggl_volunteers() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_ggl_volunteers() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_ggl_volunteers() TO authenticated;
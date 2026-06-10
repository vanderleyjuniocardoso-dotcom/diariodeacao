REVOKE EXECUTE ON FUNCTION public.sync_profile_from_registration(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.sync_profiles_from_volunteer_sources() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_voluntagram_credential(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.sync_profile_from_registration(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_profiles_from_volunteer_sources() TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_voluntagram_credential(uuid) TO authenticated, service_role;
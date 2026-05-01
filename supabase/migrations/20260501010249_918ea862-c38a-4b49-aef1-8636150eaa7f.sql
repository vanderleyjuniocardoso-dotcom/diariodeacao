
-- The handle_new_user is a trigger function, not callable via API, but revoke to satisfy linter
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;

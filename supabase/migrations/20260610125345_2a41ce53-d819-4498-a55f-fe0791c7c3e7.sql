DROP VIEW IF EXISTS public.profiles_public;

CREATE TABLE public.profiles_public (
  id uuid PRIMARY KEY,
  full_name text,
  social_name text,
  avatar_url text,
  bio text,
  volunteer_credential text,
  volunteer_level smallint,
  ggl_id uuid,
  unit text,
  created_at timestamp with time zone
);

GRANT SELECT ON public.profiles_public TO authenticated;
GRANT ALL ON public.profiles_public TO service_role;

ALTER TABLE public.profiles_public ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated volunteers can view public profiles"
ON public.profiles_public
FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.profiles_public (id, full_name, social_name, avatar_url, bio, volunteer_credential, volunteer_level, ggl_id, unit, created_at)
SELECT id, full_name, social_name, avatar_url, bio, volunteer_credential, volunteer_level, ggl_id, unit, created_at
FROM public.profiles
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    social_name = EXCLUDED.social_name,
    avatar_url = EXCLUDED.avatar_url,
    bio = EXCLUDED.bio,
    volunteer_credential = EXCLUDED.volunteer_credential,
    volunteer_level = EXCLUDED.volunteer_level,
    ggl_id = EXCLUDED.ggl_id,
    unit = EXCLUDED.unit,
    created_at = EXCLUDED.created_at;

CREATE OR REPLACE FUNCTION public.sync_profiles_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.profiles_public WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.profiles_public (id, full_name, social_name, avatar_url, bio, volunteer_credential, volunteer_level, ggl_id, unit, created_at)
  VALUES (NEW.id, NEW.full_name, NEW.social_name, NEW.avatar_url, NEW.bio, NEW.volunteer_credential, NEW.volunteer_level, NEW.ggl_id, NEW.unit, NEW.created_at)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      social_name = EXCLUDED.social_name,
      avatar_url = EXCLUDED.avatar_url,
      bio = EXCLUDED.bio,
      volunteer_credential = EXCLUDED.volunteer_credential,
      volunteer_level = EXCLUDED.volunteer_level,
      ggl_id = EXCLUDED.ggl_id,
      unit = EXCLUDED.unit,
      created_at = EXCLUDED.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profiles_public_trigger ON public.profiles;
CREATE TRIGGER sync_profiles_public_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profiles_public();

GRANT EXECUTE ON FUNCTION public.sync_profiles_public() TO service_role;
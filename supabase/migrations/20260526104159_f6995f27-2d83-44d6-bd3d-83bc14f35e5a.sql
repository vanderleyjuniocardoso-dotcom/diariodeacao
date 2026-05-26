ALTER TABLE public.ggl_groups ADD COLUMN IF NOT EXISTS unit_actions text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.volunteer_actions ADD COLUMN IF NOT EXISTS satisfaction_action smallint;
ALTER TABLE public.volunteer_actions ADD COLUMN IF NOT EXISTS satisfaction_support smallint;
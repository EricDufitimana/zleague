-- Only roll back before group fixtures have been created. Never delete results.
BEGIN;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.matches WHERE group_id IS NOT NULL)
  THEN RAISE EXCEPTION 'Group fixtures exist; rollback refused to preserve results.'; END IF; END $$;
DROP TRIGGER guard_finalized_group_results ON public.matches;
DROP FUNCTION public.guard_finalized_group_results();
DROP FUNCTION public.finalize_boys_groups(bigint,public.sport_type,bigint[],jsonb);
DROP FUNCTION public.create_boys_groups(bigint,public.sport_type,bigint[],bigint[]);
ALTER TABLE public.matches DROP COLUMN group_id;
DROP TABLE public.tournament_group_teams;
DROP TABLE public.tournament_groups;
NOTIFY pgrst, 'reload schema';
COMMIT;

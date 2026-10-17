-- Rollback for 2026-10-17-families-table.sql
-- Restores teams.name / players.family to the public.family_type enum.
-- This only succeeds while every value in those columns is still a label of
-- that enum; once a family has been renamed or added through the dashboard the
-- enum no longer covers the data and the ALTERs below will fail by design.

BEGIN;

ALTER TABLE public.teams   DROP CONSTRAINT IF EXISTS teams_name_families_fkey;
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_family_families_fkey;

DROP INDEX IF EXISTS public.teams_name_idx;
DROP INDEX IF EXISTS public.players_family_idx;

ALTER TABLE public.teams   ALTER COLUMN name   TYPE public.family_type USING name::public.family_type;
ALTER TABLE public.players ALTER COLUMN family TYPE public.family_type USING family::public.family_type;

DROP TABLE IF EXISTS public.families;

COMMIT;

-- Season promotion applied 2026-10-15 (already run against the database).
-- Promotes teams.grade one level for ONGOING championships only, so ended
-- championships keep the grades their games were actually played at.
--   ey -> s4,  s4 -> s5,  s5 -> s6,  s6 -> alumni
--
-- Run the ALTER TYPE on its own first: PostgreSQL cannot use a newly added
-- enum value in the same transaction that added it.

ALTER TYPE public.grade ADD VALUE IF NOT EXISTS 'alumni' AFTER 's6';

UPDATE teams AS t
SET grade = (CASE t.grade::text
    WHEN 's6' THEN 'alumni'
    WHEN 's5' THEN 's6'
    WHEN 's4' THEN 's5'
    WHEN 'ey' THEN 's4'
    ELSE t.grade::text
  END)::public.grade
WHERE t.championship_id IN (SELECT id FROM championships WHERE status = 'ongoing');

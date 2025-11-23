-- Migration: Change volleyball_scores to use JSONB for sets
-- This allows for dynamic number of sets (not just 3)

-- Step 1: Add new JSONB column for sets
ALTER TABLE volleyball_scores 
ADD COLUMN IF NOT EXISTS sets JSONB DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing data from set1, set2, set3 to JSONB format
-- Format: [{"setNumber": 1, "points": 25}, {"setNumber": 2, "points": 20}, ...]
UPDATE volleyball_scores
SET sets = jsonb_build_array(
  CASE WHEN set1 > 0 THEN jsonb_build_object('setNumber', 1, 'points', set1) ELSE NULL END,
  CASE WHEN set2 > 0 THEN jsonb_build_object('setNumber', 2, 'points', set2) ELSE NULL END,
  CASE WHEN set3 > 0 THEN jsonb_build_object('setNumber', 3, 'points', set3) ELSE NULL END
)
WHERE sets = '[]'::jsonb OR sets IS NULL;

-- Remove NULL values from the array
UPDATE volleyball_scores
SET sets = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(sets) elem
  WHERE elem IS NOT NULL
)
WHERE sets IS NOT NULL;

-- Step 3: Make sets column NOT NULL after migration
ALTER TABLE volleyball_scores 
ALTER COLUMN sets SET NOT NULL;

-- Step 4: Drop old columns (optional - comment out if you want to keep them for now)
-- ALTER TABLE volleyball_scores DROP COLUMN IF EXISTS set1;
-- ALTER TABLE volleyball_scores DROP COLUMN IF EXISTS set2;
-- ALTER TABLE volleyball_scores DROP COLUMN IF EXISTS set3;

-- Step 5: Add index for JSONB queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_volleyball_scores_sets 
  ON volleyball_scores USING GIN (sets);

-- Add comment
COMMENT ON COLUMN volleyball_scores.sets IS 'JSONB array of sets. Each set object: {"setNumber": 1, "points": 25}';


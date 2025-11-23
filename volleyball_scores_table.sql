-- Create volleyball_scores table
CREATE TABLE IF NOT EXISTS volleyball_scores (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL,
  team_id BIGINT NOT NULL,
  set1 INTEGER NOT NULL DEFAULT 0,
  set2 INTEGER NOT NULL DEFAULT 0,
  set3 INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_volleyball_scores_match 
    FOREIGN KEY (match_id) 
    REFERENCES matches(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_volleyball_scores_team 
    FOREIGN KEY (team_id) 
    REFERENCES teams(id) 
    ON DELETE CASCADE,
  
  -- Ensure one record per team per match
  CONSTRAINT unique_volleyball_score_per_team_match 
    UNIQUE (match_id, team_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_volleyball_scores_match_id 
  ON volleyball_scores(match_id);

CREATE INDEX IF NOT EXISTS idx_volleyball_scores_team_id 
  ON volleyball_scores(team_id);

-- Add comment to table
COMMENT ON TABLE volleyball_scores IS 'Stores volleyball set scores for each team in a match. Each set requires 25 points to win with a 2-point margin.';

-- Add comments to columns
COMMENT ON COLUMN volleyball_scores.set1 IS 'Points scored by team in set 1';
COMMENT ON COLUMN volleyball_scores.set2 IS 'Points scored by team in set 2';
COMMENT ON COLUMN volleyball_scores.set3 IS 'Points scored by team in set 3';


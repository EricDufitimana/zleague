type ScoreRow = {
  team_id: number;
  player_id?: number | null;
  points?: number;
  rebounds?: number;
  assists?: number;
  goals?: number;
  shots_on_target?: number;
  saves?: number;
};

/** Older results contain team rows; current score consoles store player rows only. */
export function restoreTeamScores(
  rows: ScoreRow[], teamId: number, sport: 'basketball' | 'football', savedScore?: number | null,
) {
  const teamRows = rows.filter(row => row.team_id === teamId);
  const total = teamRows.find(row => !row.player_id);
  const players = teamRows.filter(row => row.player_id);
  if (!total && !players.length && savedScore !== 0) {
    throw new Error('Saved player statistics are missing. Retry loading before editing this result.');
  }
  const sum = (key: keyof Omit<ScoreRow, 'team_id' | 'player_id'>) =>
    total ? Number(total[key] ?? 0) : players.reduce((value, row) => value + Number(row[key] ?? 0), 0);
  return {
    team_id: teamId,
    // Preserve recorded totals so incomplete player records remain visible to validation.
    points: sport === 'basketball' ? (total ? sum('points') : savedScore ?? sum('points')) : 0,
    goals: sport === 'football' ? (total ? sum('goals') : savedScore ?? sum('goals')) : 0,
    rebounds: sum('rebounds'), assists: sum('assists'),
    shots_on_target: sum('shots_on_target'), saves: sum('saves'),
  };
}

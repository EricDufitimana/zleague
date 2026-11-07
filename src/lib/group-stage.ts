export type GroupSport = 'football' | 'basketball' | 'volleyball';
export interface GroupTeam { id: number; name: string; grade?: string }
export interface GroupMatch {
  id: number;
  team_a_id: number | null;
  team_b_id: number | null;
  team_a_score: number | null;
  team_b_score: number | null;
  winner_id: number | null;
  status: string;
  sport_type: string;
  match_time?: string | null;
  created_at: string;
  penalty_score?: { team_a: number; team_b: number } | null;
}
export interface FormResult { matchId: number; won: boolean; penalties: boolean; label: string }
export interface Standing {
  team: GroupTeam; mp: number; wins: number; losses: number; difference: number;
  points: number; form: FormResult[]; headToHead: number; tied: boolean;
}
export interface TournamentGroup {
  id: number; name: string; championship_id: number; sport_type: GroupSport;
  finalized: boolean; teams: GroupTeam[]; matches: GroupMatch[];
  qualification_order?: number[] | null;
}

export function wonOnPenalties(match: GroupMatch): boolean {
  return match.sport_type === 'football' && match.status === 'played' &&
    match.team_a_score === match.team_b_score && !!match.penalty_score &&
    match.penalty_score.team_a !== match.penalty_score.team_b && match.winner_id != null;
}

/** Match goals/points/sets alone count toward difference, never shootout goals. */
export function calculateStandings(teams: GroupTeam[], matches: GroupMatch[]): Standing[] {
  const rows: Standing[] = teams.map(team => ({ team, mp: 0, wins: 0, losses: 0,
    difference: 0, points: 0, form: [], headToHead: 0, tied: false }));
  const byId = new Map(rows.map(row => [Number(row.team.id), row]));
  const completed = matches.filter(m => m.status === 'played' && m.winner_id != null &&
    m.team_a_score != null && m.team_b_score != null &&
    (m.winner_id === m.team_a_id || m.winner_id === m.team_b_id))
    .sort((a, b) => new Date(a.match_time || a.created_at).getTime() -
      new Date(b.match_time || b.created_at).getTime() || a.id - b.id);
  for (const match of completed) {
    const a = byId.get(Number(match.team_a_id)), b = byId.get(Number(match.team_b_id));
    if (!a || !b) continue;
    for (const [row, opponent, own, against] of [
      [a, b, match.team_a_score!, match.team_b_score!],
      [b, a, match.team_b_score!, match.team_a_score!],
    ] as const) {
      const won = Number(match.winner_id) === Number(row.team.id);
      row.mp++; row.wins += Number(won); row.losses += Number(!won);
      row.points = row.wins * 3; row.difference += own - against;
      const penalties = wonOnPenalties(match);
      row.form.push({ matchId: match.id, won, penalties,
        label: `${won ? 'Won' : 'Lost'} ${own}–${against} vs ${opponent.team.name}${penalties ? ` on penalties (${match.penalty_score!.team_a}–${match.penalty_score!.team_b})` : ''}${match.match_time ? ` · ${new Date(match.match_time).toLocaleDateString('en-GB')}` : ''}` });
    }
  }
  // A mini-table gives a consistent head-to-head tiebreak for two or three teams.
  for (const row of rows) {
    const tiedIds = new Set(rows.filter(other => other.points === row.points &&
      other.difference === row.difference).map(other => Number(other.team.id)));
    row.headToHead = completed.filter(m => tiedIds.has(Number(m.team_a_id)) &&
      tiedIds.has(Number(m.team_b_id)) && Number(m.winner_id) === Number(row.team.id)).length;
    row.form = row.form.slice(-3);
  }
  rows.sort((a, b) => b.points - a.points || b.difference - a.difference ||
    b.headToHead - a.headToHead || a.team.name.localeCompare(b.team.name));
  for (const row of rows) row.tied = rows.some(other => other !== row &&
    other.points === row.points && other.difference === row.difference && other.headToHead === row.headToHead);
  return rows;
}

export function validateGroupAssignments(a: number[], b: number[], eligibleIds: number[]) {
  if (a.length !== 3 || b.length !== 3 || new Set([...a, ...b]).size !== 6 ||
    [...a, ...b].some(id => !Number.isSafeInteger(id) || !eligibleIds.includes(id))) {
    throw new Error('Choose six different boys’ teams: three in each group.');
  }
}

export function qualificationOrder(group: TournamentGroup, requested?: number[]): number[] {
  if (group.matches.length !== 3 || group.matches.some(m => m.status !== 'played' || m.winner_id == null)) {
    throw new Error(`Finish all three matches in Group ${group.name} first.`);
  }
  const rows = calculateStandings(group.teams, group.matches);
  if (rows.some(row => row.mp !== 2)) throw new Error('The group fixtures are incomplete.');
  if (!requested) {
    if (rows.some(row => row.tied)) throw new Error(`Resolve the tied ranking in Group ${group.name} before finalizing.`);
    return rows.map(row => row.team.id);
  }
  if (requested.length !== 3 || new Set(requested).size !== 3 || requested.some(id => !rows.some(r => r.team.id === id))) {
    throw new Error('The ranking must contain each group team exactly once.');
  }
  const ordered = requested.map(id => rows.find(row => row.team.id === id)!);
  for (let i = 1; i < ordered.length; i++) {
    const previous = ordered[i - 1], current = ordered[i];
    if (current.points > previous.points || (current.points === previous.points &&
      (current.difference > previous.difference || (current.difference === previous.difference &&
        current.headToHead > previous.headToHead)))) throw new Error('Only teams still tied after all tiebreakers may be reordered.');
  }
  return requested;
}

export function validateDecisiveResult(match: Pick<GroupMatch, 'sport_type' | 'team_a_id' | 'team_b_id'>,
  a: unknown, b: unknown, winner: unknown, penalty: GroupMatch['penalty_score']) {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || Number(a) < 0 || Number(b) < 0) {
    throw new Error('Both final scores must be non-negative whole numbers.');
  }
  if (a === b) {
    if (match.sport_type !== 'football') throw new Error('Play a deciding period or set: this match cannot finish tied.');
    if (!penalty || !Number.isSafeInteger(penalty.team_a) || !Number.isSafeInteger(penalty.team_b) ||
      penalty.team_a < 0 || penalty.team_b < 0 || penalty.team_a === penalty.team_b) {
      throw new Error('Enter a decisive penalty shootout score for a tied football match.');
    }
    const expected = penalty.team_a > penalty.team_b ? match.team_a_id : match.team_b_id;
    if (Number(winner) !== Number(expected)) throw new Error('The winner must match the penalty shootout result.');
  } else {
    if (penalty != null) throw new Error('Penalty scores apply only when the football match score is tied.');
    if (Number(winner) !== Number(Number(a) > Number(b) ? match.team_a_id : match.team_b_id)) {
      throw new Error('The winner must match the final score.');
    }
  }
}

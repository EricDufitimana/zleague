import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/utils/supabase/server';
import { qualificationOrder, validateGroupAssignments, type TournamentGroup } from '@/lib/group-stage';

const sports = ['football', 'basketball', 'volleyball'];

async function requireAdmin() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const admin = createAdminClient();
  const { data } = await admin.from('users').select('role').eq('user_id', user.id).single();
  if (data?.role !== 'admin') throw new Error('Unauthorized');
  return admin;
}

async function loadGroups(championshipId: number, sport: string): Promise<TournamentGroup[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('tournament_groups').select('*, memberships:tournament_group_teams(team:teams(id,name,grade)), matches:matches(*)')
    .eq('championship_id', championshipId).eq('sport_type', sport).order('name');
  if (error) throw new Error(error.code === 'PGRST205' || error.code === '42P01'
    ? 'Group stage database setup is required. Apply prisma/sql/2026-11-07-boys-groups.sql.' : error.message);
  return (data || []).map(g => ({ ...g, teams: g.memberships.map((m: { team: unknown }) => m.team) })) as TournamentGroup[];
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : 'Group stage request failed.';
  return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 403 : 400 });
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const sport = params.get('sport') || 'football';
    if (!sports.includes(sport)) throw new Error('Choose a supported sport.');
    let championshipId = Number(params.get('championship_id'));
    if (!championshipId) {
      const { data, error } = await createAdminClient().from('championships').select('id').eq('status', 'ongoing').order('created_at', { ascending: false }).limit(1);
      if (error) throw error;
      championshipId = data?.[0]?.id;
    }
    return NextResponse.json({ groups: championshipId ? await loadGroups(championshipId, sport) : [] });
  } catch (error) { return failure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { championship_id, sport, group_a, group_b } = await request.json();
    if (!Number.isSafeInteger(championship_id) || !sports.includes(sport) || !Array.isArray(group_a) || !Array.isArray(group_b)) throw new Error('Invalid group draw.');
    const { data: teams, error } = await admin.from('teams').select('id').eq('championship_id', championship_id).eq('gender', 'male');
    if (error) throw error;
    validateGroupAssignments(group_a, group_b, (teams || []).map(t => t.id));
    const { error: drawError } = await admin.rpc('create_boys_groups', { p_championship: championship_id, p_sport: sport, p_a: group_a, p_b: group_b });
    if (drawError) throw new Error(drawError.message);
    return NextResponse.json({ groups: await loadGroups(championship_id, sport) }, { status: 201 });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { championship_id, sport, orders } = await request.json();
    if (!Number.isSafeInteger(championship_id) || !sports.includes(sport)) throw new Error('Invalid championship or sport.');
    const groups = await loadGroups(championship_id, sport);
    const a = groups.find(g => g.name === 'A'), b = groups.find(g => g.name === 'B');
    if (!a || !b || groups.some(g => g.finalized)) throw new Error('The groups are missing or already finalized.');
    const orderA = qualificationOrder(a, orders?.A), orderB = qualificationOrder(b, orders?.B);
    const snapshot = groups.flatMap(g => g.matches).sort((x, y) => x.id - y.id).map(m => ({ id: m.id, status: m.status,
      winner_id: m.winner_id, team_a_score: m.team_a_score, team_b_score: m.team_b_score }));
    const { error } = await admin.rpc('finalize_boys_groups', { p_championship: championship_id, p_sport: sport,
      p_seeds: [orderA[0], orderB[1], orderB[0], orderA[1]], p_snapshot: snapshot });
    if (error) throw new Error(error.message);
    return NextResponse.json({ groups: await loadGroups(championship_id, sport) });
  } catch (error) { return failure(error); }
}

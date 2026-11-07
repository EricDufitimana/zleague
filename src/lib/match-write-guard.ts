import { createAdminClient, createClient } from '@/utils/supabase/server';

/** Score consoles sit outside /dashboard, so write access is checked on the server. */
export async function requireScoreAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in as an admin to record results.');
  const admin = createAdminClient();
  const { data } = await admin.from('users').select('role').eq('user_id', user.id).single();
  if (data?.role !== 'admin') throw new Error('Admin access is required to record results.');
  return admin;
}

export async function requireEditableMatch(matchId: string | number) {
  const admin = await requireScoreAdmin();
  const { data: match, error } = await admin.from('matches').select('*').eq('id', matchId).single();
  if (error || !match) throw new Error('Match not found.');
  if (match.group_id) {
    const { data: group, error: groupError } = await admin.from('tournament_groups').select('finalized').eq('id', match.group_id).single();
    if (groupError) throw new Error('Could not verify group status.');
    if (group?.finalized) throw new Error('Group results are locked after qualification.');
  }
  return match;
}

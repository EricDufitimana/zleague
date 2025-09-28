import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamId = params.id;
    const supabase = await createClient();
    
    // Get team information
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get players for this team's family
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, first_name, last_name, grade, family')
      .eq('family', team.name)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (playersError) {
      console.error('Error fetching players:', playersError);
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    return NextResponse.json({
      team,
      players: players || []
    });
  } catch (error) {
    console.error('Error in team players API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

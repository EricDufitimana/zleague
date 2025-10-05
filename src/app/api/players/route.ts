import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const team_a_id = searchParams.get('team_a_id');
    const team_b_id = searchParams.get('team_b_id');

    if (!team_a_id || !team_b_id) {
      return NextResponse.json(
        { error: 'Team A ID and Team B ID are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // First, fetch the team names (families) for the given team IDs
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', [team_a_id, team_b_id]);

    if (teamsError) {
      return NextResponse.json(
        { error: 'Failed to fetch teams', details: teamsError.message },
        { status: 500 }
      );
    }

    if (!teams || teams.length === 0) {
      return NextResponse.json([]);
    }

    // Extract the family names from the teams
    const familyNames = teams.map(team => team.name);
    
    // Create a map of family name to team ID for later use
    const familyToTeamId: { [key: string]: number } = {};
    teams.forEach(team => {
      familyToTeamId[team.name] = team.id;
    });

    // Now fetch players by family names
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, first_name, last_name, family')
      .in('family', familyNames)
      .order('family', { ascending: true })
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (playersError) {
      return NextResponse.json(
        { error: 'Failed to fetch players', details: playersError.message },
        { status: 500 }
      );
    }

    // Map players to include team_id based on their family
    const playersWithTeamId = (players || []).map(player => ({
      id: player.id,
      first_name: player.first_name,
      last_name: player.last_name,
      team_id: familyToTeamId[player.family || ''] || null
    }));

    return NextResponse.json(playersWithTeamId);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch players', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

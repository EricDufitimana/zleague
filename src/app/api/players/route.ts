import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper function to map team grade to player grade enum
function mapTeamGradeToPlayerGrade(teamGrade: string): string | null {
  const gradeMap: { [key: string]: string } = {
    'ey': 'Ishami',
    's4': 'Ijabo',
    's5': 'Ingabo',
    's6': 'Ingabo'
  };
  return gradeMap[teamGrade.toLowerCase()] || null;
}

// Helper function to normalize family name to FamilyType enum
function normalizeFamilyName(familyName: string): string {
  // Map common family name formats to enum values
  const familyMap: { [key: string]: string } = {
    'KATHERINE JOHNSON': 'KATHERINE_JOHNSON',
    'YVAN BURAVAN': 'YVAN_BURAVAN',
    'Chinua Achebe': 'Chinua_Achebe',
    'RUGANZU NDOLI 2': 'RUGANZU_NDOLI_2',
    'Pele Edson Arantes Do Nascimento': 'Pele_Edson_Arantes_Do_Nascimento',
    'Toni Morrison': 'Toni_Morrison',
    'Ubald Rugirangoga': 'Ubald_Rugirangoga',
    'Charles Babbage': 'Charles_Babbage',
    'Alfred Nobel': 'Alfred_Nobel',
    'Ruth Bader Ginsberg': 'Ruth_Bader_Ginsberg',
    'AOUA KEITA': 'AOUA_KEITA',
    'Fannie Lou Hamer': 'Fannie_Lou_Hamer',
    'Niyitegeka Felestin': 'Niyitegeka_Felestin',
    'Lance Solomon Reddick': 'Lance_Solomon_Reddick',
    'ADA loveloce': 'ADA_loveloce',
    'Rosalie Gicanda': 'Rosalie_Gicanda',
    'Irena Sendler': 'Irena_Sendler',
    'Thomas Edison': 'Thomas_Edison',
    'Family 1': 'Family_1',
    'Family 2': 'Family_2',
    'Family 3': 'Family_3',
    'Family 4': 'Family_4',
    'Family 5': 'Family_5',
    'Family 6': 'Family_6',
  };
  
  // Try exact match first
  if (familyMap[familyName]) {
    return familyMap[familyName];
  }
  
  // Try case-insensitive match
  const upperName = familyName.toUpperCase();
  for (const [key, value] of Object.entries(familyMap)) {
    if (key.toUpperCase() === upperName) {
      return value;
    }
  }
  
  // If no match, try to convert to enum format (replace spaces with underscores, uppercase)
  return familyName.replace(/\s+/g, '_').toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { players: playersToCreate } = body;

    if (!playersToCreate || !Array.isArray(playersToCreate) || playersToCreate.length === 0) {
      return NextResponse.json(
        { error: 'Players array is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch team information to get grade and family name
    const teamIds = [...new Set(playersToCreate.map((p: any) => p.teamId))];
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, grade')
      .in('id', teamIds);

    if (teamsError) {
      return NextResponse.json(
        { error: 'Failed to fetch teams', details: teamsError.message },
        { status: 500 }
      );
    }

    if (!teams || teams.length === 0) {
      return NextResponse.json(
        { error: 'Teams not found' },
        { status: 404 }
      );
    }

    // Create a map of team ID to team info
    const teamMap: { [key: number]: { name: string; grade: string } } = {};
    teams.forEach(team => {
      teamMap[team.id] = { name: team.name, grade: team.grade };
    });

    // Prepare player data for insertion
    const playersData = playersToCreate.map((player: any) => {
      const team = teamMap[parseInt(player.teamId)];
      if (!team) {
        throw new Error(`Team ${player.teamId} not found`);
      }

      const playerGrade = mapTeamGradeToPlayerGrade(team.grade);
      // Use team name as-is (Supabase doesn't use underscores, just use the team name directly)
      const familyName = team.name;

      return {
        first_name: player.firstName.trim(),
        last_name: player.lastName.trim(),
        grade: playerGrade,
        family: familyName,
      };
    });

    // Insert players
    const { data: createdPlayers, error: insertError } = await supabase
      .from('players')
      .insert(playersData)
      .select('id, first_name, last_name, family');

    if (insertError) {
      console.error('Error creating players:', insertError);
      return NextResponse.json(
        { error: 'Failed to create players', details: insertError.message },
        { status: 500 }
      );
    }

    // Map created players back to their team IDs
    const result = createdPlayers.map((player, index) => {
      const originalPlayer = playersToCreate[index];
      return {
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
        team_id: parseInt(originalPlayer.teamId),
      };
    });

    return NextResponse.json({ players: result }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/players:', error);
    return NextResponse.json(
      { error: 'Failed to create players', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

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

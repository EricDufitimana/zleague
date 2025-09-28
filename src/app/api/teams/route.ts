import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, grade, gender, championship_id } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!grade || !['ey', 's4', 's5', 's6'].includes(grade)) {
      return NextResponse.json(
        { error: 'Grade is required and must be one of: ey, s4, s5, s6' },
        { status: 400 }
      );
    }

    if (!championship_id || typeof championship_id !== 'number') {
      return NextResponse.json(
        { error: 'Championship ID is required and must be a number' },
        { status: 400 }
      );
    }

    if (gender && !['male', 'female'].includes(gender)) {
      return NextResponse.json(
        { error: 'Gender must be either male or female if provided' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        grade,
        gender: gender,
        championship_id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create team', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Team created successfully',
        team 
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create team', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const championship_id = searchParams.get('championship_id');

    if (!championship_id) {
      return NextResponse.json(
        { error: 'Championship ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .eq('championship_id', championship_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch teams', details: error.message },
        { status: 500 }
      );
    }

    // Get player counts for each team
    const teamsWithPlayerCounts = await Promise.all(
      teams.map(async (team) => {
        const { count } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);
        
        return {
          ...team,
          player_count: count || 0
        };
      })
    );

    return NextResponse.json(teamsWithPlayerCounts);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch teams', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

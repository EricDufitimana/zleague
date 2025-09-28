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

    const { data: players, error } = await supabase
      .from('players')
      .select('id, first_name, last_name, team_id')
      .in('team_id', [team_a_id, team_b_id])
      .order('team_id', { ascending: true })
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch players', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(players);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch players', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

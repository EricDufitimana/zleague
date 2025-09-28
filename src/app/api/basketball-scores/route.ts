import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Recording basketball scores with data:', body);
    
    const { match_id, scores } = body;

    if (!match_id || !scores || !Array.isArray(scores)) {
      console.log('Missing or invalid data:', { match_id, scores });
      return NextResponse.json(
        { error: 'Match ID and scores array are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Supabase client created, attempting to insert basketball scores...');

    // Insert all scores (team and individual player scores)
    const { data: insertedScores, error } = await supabase
      .from('basketball_scores')
      .insert(scores.map(score => ({
        match_id,
        team_id: score.team_id,
        points: score.points,
        rebounds: score.rebounds,
        assists: score.assists,
        player_id: score.player_id || null,
        created_at: new Date().toISOString()
      })))
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to record basketball scores', details: error.message },
        { status: 500 }
      );
    }

    console.log('Basketball scores recorded successfully:', insertedScores);
    return NextResponse.json(
      { 
        message: 'Basketball scores recorded successfully',
        scores: insertedScores 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/basketball-scores:', error);
    return NextResponse.json(
      { error: 'Failed to record basketball scores', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const match_id = searchParams.get('match_id');

    if (!match_id) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: scores, error } = await supabase
      .from('basketball_scores')
      .select(`
        *,
        team:teams(*)
      `)
      .eq('match_id', match_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch basketball scores', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(scores);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch basketball scores', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

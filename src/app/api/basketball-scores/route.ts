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

    console.log('Supabase client created, checking for existing scores...');

    // Delete existing scores for this match (to allow updates)
    const { error: deleteError } = await supabase
      .from('basketball_scores')
      .delete()
      .eq('match_id', match_id);

    if (deleteError) {
      console.error('Error deleting existing scores:', deleteError);
      // Continue anyway - might be first time recording
    } else {
      console.log('Existing scores deleted successfully');
    }

    console.log('Attempting to insert basketball scores...');

    // Insert all scores (team and individual player scores)
    const { data: insertedScores, error } = await supabase
      .from('basketball_scores')
      .insert(scores.map(score => ({
        match_id,
        team_id: score.team_id,
        points: score.points,
        rebounds: score.rebounds,
        assists: score.assists,
        three_points_made: score.three_points_made || 0,
        three_points_attempted: score.three_points_attempted || 0,
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

    // Calculate team totals and update match
    const teamTotals = scores.reduce((acc: Record<number, number>, score) => {
      const teamId = score.team_id;
      if (!acc[teamId]) {
        acc[teamId] = 0;
      }
      acc[teamId] += score.points || 0;
      return acc;
    }, {});

    console.log('Team totals calculated:', teamTotals);

    // Get match to determine which team is team_a and team_b
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('team_a_id, team_b_id')
      .eq('id', match_id)
      .single();

    if (matchError) {
      console.error('Error fetching match:', matchError);
    } else if (match) {
      const updateData: { team_a_score?: number; team_b_score?: number } = {};
      
      if (match.team_a_id && teamTotals[match.team_a_id] !== undefined) {
        updateData.team_a_score = teamTotals[match.team_a_id];
      }
      
      if (match.team_b_id && teamTotals[match.team_b_id] !== undefined) {
        updateData.team_b_score = teamTotals[match.team_b_id];
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('matches')
          .update(updateData)
          .eq('id', match_id);

        if (updateError) {
          console.error('Error updating match team scores:', updateError);
        } else {
          console.log('Match team scores updated:', updateData);
        }
      }
    }

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

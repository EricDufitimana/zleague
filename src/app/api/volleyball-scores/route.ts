import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Recording volleyball scores with data:', body);
    
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
      .from('volleyball_scores')
      .delete()
      .eq('match_id', match_id);

    if (deleteError) {
      console.error('Error deleting existing scores:', deleteError);
      // Continue anyway - might be first time recording
    } else {
      console.log('Existing scores deleted successfully');
    }

    console.log('Attempting to insert volleyball scores...');

    // Insert all scores (set scores for each team)
    // scores should have format: { team_id, sets: [{ setNumber: 1, points: 25 }, ...] }
    const { data: insertedScores, error } = await supabase
      .from('volleyball_scores')
      .insert(scores.map(score => ({
        match_id,
        team_id: score.team_id,
        sets: score.sets || [], // JSONB array of sets
        created_at: new Date().toISOString()
      })))
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to record volleyball scores', details: error.message },
        { status: 500 }
      );
    }

    console.log('Volleyball scores recorded successfully:', insertedScores);

    // Get match to determine which team is team_a and team_b
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('team_a_id, team_b_id')
      .eq('id', match_id)
      .single();

    if (matchError) {
      console.error('Error fetching match:', matchError);
    } else if (match && scores.length >= 2) {
      // Find scores for team A and team B
      const teamAScore = scores.find((s: any) => s.team_id === match.team_a_id);
      const teamBScore = scores.find((s: any) => s.team_id === match.team_b_id);

      if (teamAScore && teamBScore) {
        // Calculate sets won for each team
        // Compare sets by setNumber
        const teamASets = (teamAScore.sets || []).sort((a: any, b: any) => a.setNumber - b.setNumber);
        const teamBSets = (teamBScore.sets || []).sort((a: any, b: any) => a.setNumber - b.setNumber);
        
        let teamASetsWon = 0;
        let teamBSetsWon = 0;

        // Find the maximum number of sets
        const maxSets = Math.max(teamASets.length, teamBSets.length);

        for (let i = 0; i < maxSets; i++) {
          const teamASet = teamASets.find((s: any) => s.setNumber === i + 1);
          const teamBSet = teamBSets.find((s: any) => s.setNumber === i + 1);

          if (teamASet && teamBSet) {
            if (teamASet.points > teamBSet.points) teamASetsWon++;
            else if (teamBSet.points > teamASet.points) teamBSetsWon++;
          }
        }

        console.log('Sets won calculated:', { teamASetsWon, teamBSetsWon });

        // Update match with sets won
        const updateData: { team_a_score?: number; team_b_score?: number } = {
          team_a_score: teamASetsWon,
          team_b_score: teamBSetsWon
        };

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
        message: 'Volleyball scores recorded successfully',
        scores: insertedScores 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/volleyball-scores:', error);
    return NextResponse.json(
      { error: 'Failed to record volleyball scores', details: error instanceof Error ? error.message : 'Unknown error' },
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
      .from('volleyball_scores')
      .select(`
        *,
        team:teams(*)
      `)
      .eq('match_id', match_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch volleyball scores', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ scores });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch volleyball scores', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


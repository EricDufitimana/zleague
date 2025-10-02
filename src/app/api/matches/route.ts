import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Tournament status hierarchy based on your schema
const TOURNAMENT_STATUSES = {
  boys: ['preliminary', 'semi-finals', 'finals'],
  girls: ['preliminary', 'quarter-finals', 'semi-finals', 'finals']
};

function getNextStatus(currentStatus: string, gender: 'boys' | 'girls'): string | null {
  const statuses = TOURNAMENT_STATUSES[gender];
  const currentIndex = statuses.indexOf(currentStatus);
  return currentIndex !== -1 && currentIndex < statuses.length - 1 
    ? statuses[currentIndex + 1] 
    : null;
}

async function findOrCreateNextMatch(
  championship_id: string,
  sport_type: string,
  gender: 'boys' | 'girls',
  current_status: string
): Promise<string | null> {
  const nextStatus = getNextStatus(current_status, gender);
  if (!nextStatus) {
    console.log(`No next status after ${current_status} for ${gender}`);
    return null;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log(`Finding/creating next match: ${current_status} → ${nextStatus} for ${gender}`);
    
    // Build the correct stage field name and filter
    const stageField = gender === 'boys' ? 'boys_stage_groups' : 'girls_stage_groups';
    
    // Look for existing matches in the next round that have space
    const { data: existingMatches, error: searchError } = await supabase
      .from('matches')
      .select('id, team_a_id, team_b_id, next_match_id')
      .eq('championship_id', championship_id)
      .eq('sport_type', sport_type)
      .eq(stageField, nextStatus)
      .or('team_a_id.is.null,team_b_id.is.null');

    if (searchError) {
      console.error('Error searching for existing matches:', searchError);
    } else if (existingMatches && existingMatches.length > 0) {
      // Find match with available slot
      const availableMatch = existingMatches.find(match => 
        !match.team_a_id || !match.team_b_id
      );
      
      if (availableMatch) {
        console.log(`Found available next match: ${availableMatch.id}`);
        return availableMatch.id.toString();
      }
    }

    // Check how many matches are already pointing to each next_match_id
    // to find matches that only have 1 feeder (and can accept another)
    const { data: allCurrentRoundMatches, error: allMatchesError } = await supabase
      .from('matches')
      .select('id, next_match_id')
      .eq('championship_id', championship_id)
      .eq('sport_type', sport_type)
      .eq(stageField, current_status)
      .not('next_match_id', 'is', null);

    if (!allMatchesError && allCurrentRoundMatches) {
      // Count how many matches point to each next_match_id
      const nextMatchCounts = new Map<string, number>();
      allCurrentRoundMatches.forEach(match => {
        if (match.next_match_id) {
          const id = match.next_match_id.toString();
          nextMatchCounts.set(id, (nextMatchCounts.get(id) || 0) + 1);
        }
      });

      console.log('Next match usage:', Object.fromEntries(nextMatchCounts));

      // Find a next match that only has 1 match pointing to it
      for (const [nextMatchId, count] of nextMatchCounts.entries()) {
        if (count === 1) {
          console.log(`Reusing next match ${nextMatchId} (currently has ${count} feeder)`);
          return nextMatchId;
        }
      }
    }

    // No suitable match found, create a new one
    console.log(`Creating new ${nextStatus} match for ${gender}`);
    
    // Recursively create the next match's next match (if not final)
    const subsequentMatchId = nextStatus !== 'finals' 
      ? await findOrCreateNextMatch(championship_id, sport_type, gender, nextStatus)
      : null;

    const insertData: any = {
      championship_id: parseInt(championship_id),
      sport_type: sport_type,
      status: 'not_yet_scheduled',
      team_a_id: null,
      team_b_id: null,
      next_match_id: subsequentMatchId ? parseInt(subsequentMatchId) : null,
    };

    // Set the appropriate stage field
    if (gender === 'boys') {
      insertData.boys_stage_groups = nextStatus;
    } else {
      insertData.girls_stage_groups = nextStatus;
    }

    const { data: newMatch, error: createError } = await supabase
      .from('matches')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error('Error creating new match:', createError);
      return null;
    }

    console.log(`Created new next match: ${newMatch.id}`);
    return newMatch.id.toString();
  } catch (error) {
    console.error('Error in findOrCreateNextMatch:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Creating match with data:', body);
    
    const { 
      team_a_id, 
      team_b_id, 
      championship_id, 
      sport_type, 
      status = 'not_yet_scheduled',
      gender = 'boys',
      boys_stage_groups = 'preliminary',
      girls_stage_groups = 'preliminary'
    } = body;

    if (!team_a_id || !team_b_id || !championship_id || !sport_type || !gender) {
      console.log('Missing required fields:', { team_a_id, team_b_id, championship_id, sport_type, gender });
      return NextResponse.json(
        { error: 'Team A ID, Team B ID, Championship ID, Sport Type, and Gender are required' },
        { status: 400 }
      );
    }

    if (!['boys', 'girls'].includes(gender)) {
      return NextResponse.json(
        { error: 'Gender must be either "boys" or "girls"' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
      // Get the current stage based on gender
      const currentStage = gender === 'boys' ? boys_stage_groups : girls_stage_groups;
      
      // Find or create the next match
      const nextMatchId = await findOrCreateNextMatch(
        championship_id, 
        sport_type, 
        gender, 
        currentStage
      );

      // Prepare insert data
      const insertData: any = {
        team_a_id: parseInt(team_a_id),
        team_b_id: parseInt(team_b_id),
        championship_id: parseInt(championship_id),
        sport_type: sport_type,
        status: status,
        next_match_id: nextMatchId ? parseInt(nextMatchId) : null,
      };

      // Set the appropriate stage field
      if (gender === 'boys') {
        insertData.boys_stage_groups = boys_stage_groups;
      } else {
        insertData.girls_stage_groups = girls_stage_groups;
      }

      // Create the current match
      const { data: match, error } = await supabase
        .from('matches')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating match:', error);
        return NextResponse.json(
          { error: 'Failed to create match', details: error.message },
          { status: 500 }
        );
      }

      console.log('Match created successfully:', match);
      console.log(`Linked to next match ID: ${nextMatchId}`);

      return NextResponse.json(
        { 
          message: 'Match created successfully',
          match,
          next_match_id: nextMatchId
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating match:', error);
      return NextResponse.json(
        { error: 'Failed to create match', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in POST /api/matches:', error);
    return NextResponse.json(
      { error: 'Failed to create match', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const championship_id = searchParams.get('championship_id');
    const status = searchParams.get('status');
    const gender = searchParams.get('gender');
    const boys_stage_groups = searchParams.get('boys_stage_groups');
    const girls_stage_groups = searchParams.get('girls_stage_groups');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase.from('matches').select('*');

    if (championship_id) {
      query = query.eq('championship_id', championship_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (gender) {
      if (gender === 'boys') {
        query = query.not('boys_stage_groups', 'is', null);
      } else if (gender === 'girls') {
        query = query.not('girls_stage_groups', 'is', null);
      }
    }

    if (boys_stage_groups) {
      query = query.eq('boys_stage_groups', boys_stage_groups);
    }

    if (girls_stage_groups) {
      query = query.eq('girls_stage_groups', girls_stage_groups);
    }

    query = query.order('created_at', { ascending: false });

    const { data: matches, error } = await query;

    if (error) {
      console.error('Supabase error fetching matches:', error);
      return NextResponse.json(
        { error: 'Failed to fetch matches', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(matches);
  } catch (error) {
    console.error('Error in GET matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matches', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { match_id, match_time, status, winner_id } = body;

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

    try {
      // Get current match details
      const { data: currentMatch, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', match_id)
        .single();

      if (fetchError || !currentMatch) {
        return NextResponse.json(
          { error: 'Match not found' },
          { status: 404 }
        );
      }

      // Build update object
      const updateData: any = {};
      
      if (match_time !== undefined) {
        updateData.match_time = new Date(match_time).toISOString();
      }
      
      if (status !== undefined) {
        updateData.status = status;
      }
      
      if (winner_id !== undefined) {
        updateData.winner_id = parseInt(winner_id);
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'At least one field to update is required' },
          { status: 400 }
        );
      }

      // Update the current match
      const { data: updatedMatch, error: updateError } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', match_id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Supabase error updating match:', updateError);
        return NextResponse.json(
          { error: 'Failed to update match', details: updateError.message },
          { status: 500 }
        );
      }

      // If winner set and next match exists, advance the winner
      if (winner_id && currentMatch.next_match_id) {
        const { data: nextMatch, error: nextMatchError } = await supabase
          .from('matches')
          .select('*')
          .eq('id', currentMatch.next_match_id)
          .single();

        if (nextMatch && !nextMatchError) {
          const updateNextMatch: any = {};
          
          if (!nextMatch.team_a_id) {
            updateNextMatch.team_a_id = parseInt(winner_id);
          } else if (!nextMatch.team_b_id) {
            updateNextMatch.team_b_id = parseInt(winner_id);
          } else {
            console.log('Warning: Next match already has both teams assigned');
          }

          if (Object.keys(updateNextMatch).length > 0) {
            const { error: advanceError } = await supabase
              .from('matches')
              .update(updateNextMatch)
              .eq('id', currentMatch.next_match_id);

            if (advanceError) {
              console.error('Error advancing winner to next match:', advanceError);
            } else {
              console.log(`Winner ${winner_id} advanced to next match ${currentMatch.next_match_id}`);
            }
          }
        }
      }

      return NextResponse.json(
        { 
          message: 'Match updated successfully',
          match: updatedMatch 
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Error updating match:', error);
      return NextResponse.json(
        { error: 'Failed to update match', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in PATCH /api/matches:', error);
    return NextResponse.json(
      { error: 'Failed to update match', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
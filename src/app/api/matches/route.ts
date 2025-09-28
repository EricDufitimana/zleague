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

async function createNextRoundMatch(
  championship_id: string, 
  sport_type: string, 
  gender: 'boys' | 'girls',
  current_status: string
): Promise<string | null> {
  const nextStatus = getNextStatus(current_status, gender);
  if (!nextStatus) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log(`Looking for next match: ${current_status} → ${nextStatus} for ${gender}`);
    
    // First, check if there are existing next matches with the next status
    const { data: existingNextMatches, error: searchError } = await supabase
      .from('matches')
      .select('id, team_a_id, team_b_id')
      .eq('championship_id', championship_id)
      .eq('sport_type', sport_type)
      .or(`team_a_id.is.null,team_b_id.is.null`)
      .limit(10);

    if (searchError) {
      console.error('Error searching for existing next matches:', searchError);
      return null;
    }

    // Check if any existing next match has space (null team_a_id or team_b_id)
    if (existingNextMatches && existingNextMatches.length > 0) {
      const availableMatch = existingNextMatches.find(match => 
        match.team_a_id === null || match.team_b_id === null
      );
      
      if (availableMatch) {
        console.log(`Found available next match with ID: ${availableMatch.id}`);
        return availableMatch.id.toString();
      }
    }

    // Check if any existing next match is already used by two teams
    const { data: allMatches, error: allMatchesError } = await supabase
      .from('matches')
      .select('id, next_match_id')
      .eq('championship_id', championship_id)
      .eq('sport_type', sport_type);

    if (allMatchesError) {
      console.error('Error fetching all matches:', allMatchesError);
      return null;
    }

    // Count how many matches point to each next_match_id
    const nextMatchCounts = new Map<string, number>();
    allMatches?.forEach(match => {
      if (match.next_match_id) {
        const count = nextMatchCounts.get(match.next_match_id.toString()) || 0;
        nextMatchCounts.set(match.next_match_id.toString(), count + 1);
      }
    });

    console.log('Next match usage counts:', Object.fromEntries(nextMatchCounts));

    // Look for a next match that has only one match pointing to it (not used by two teams)
    for (const [nextMatchId, count] of nextMatchCounts.entries()) {
      if (count === 1) {
        console.log(`Found next match with ID ${nextMatchId} used by only ${count} match - reusing it`);
        return nextMatchId;
      }
    }

    // No suitable existing match found, create a new one
    console.log(`Creating new next match: ${current_status} → ${nextStatus} for ${gender}`);
    
    const { data: nextMatch, error } = await supabase
      .from('matches')
      .insert({
        championship_id: parseInt(championship_id),
        sport_type: sport_type,
        status: 'not_yet_scheduled',
        ...(gender === 'boys' ? { boys_stage_groups: nextStatus } : { girls_stage_groups: nextStatus }),
        team_a_id: null,
        team_b_id: null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating next match:', error);
      return null;
    }

    console.log(`Created new next match with ID: ${nextMatch.id}`);
    return nextMatch.id.toString();
  } catch (error) {
    console.error('Error creating next match:', error);
    return null;
  }
}

async function findOrCreateNextMatch(
  championship_id: string,
  sport_type: string,
  gender: 'boys' | 'girls',
  current_status: string
): Promise<string | null> {
  const nextStatus = getNextStatus(current_status, gender);
  if (!nextStatus) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // First, look for existing next round matches with the next status
    const { data: existingNextMatches, error: searchError } = await supabase
      .from('matches')
      .select('id, team_a_id, team_b_id, next_match_id')
      .eq('championship_id', championship_id)
      .eq('sport_type', sport_type)
      .or(`team_a_id.is.null,team_b_id.is.null`)
      .limit(10);

    if (searchError) {
      console.error('Error searching for existing matches:', searchError);
      return null;
    }

    // If we found available matches, check if any have space
    if (existingNextMatches && existingNextMatches.length > 0) {
      // Look for matches that have space (null team_a_id or team_b_id)
      const availableMatch = existingNextMatches.find(match => 
        match.team_a_id === null || match.team_b_id === null
      );
      
      if (availableMatch) {
        return availableMatch.id.toString();
      }
    }

    // No available match found, check if we should link to an existing match
    // or create a completely new one
    const { data: allNextMatches, error: allMatchesError } = await supabase
      .from('matches')
      .select('id, next_match_id')
      .eq('championship_id', championship_id)
      .eq('sport_type', sport_type);

    if (allMatchesError) {
      console.error('Error fetching all matches:', allMatchesError);
      return await createNextRoundMatch(championship_id, sport_type, gender, current_status);
    }

    // Count how many matches point to each next_match_id
    const nextMatchCounts = new Map<string, number>();
    allNextMatches?.forEach(match => {
      if (match.next_match_id) {
        const count = nextMatchCounts.get(match.next_match_id.toString()) || 0;
        nextMatchCounts.set(match.next_match_id.toString(), count + 1);
      }
    });

    console.log('Next match counts:', Object.fromEntries(nextMatchCounts));

    // Look for a next match that has only one match pointing to it
    for (const [nextMatchId, count] of nextMatchCounts.entries()) {
      if (count === 1) {
        // This next match has only one match pointing to it, we can link to it
        console.log(`Linking to existing next match ${nextMatchId} (count: ${count})`);
        return nextMatchId;
      }
    }

    console.log('No suitable existing match found, creating new one');

    // No suitable existing match found, create a new one
    return await createNextRoundMatch(championship_id, sport_type, gender, current_status);
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
      gender = 'boys', // Default to boys, should be provided
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
      // Find or create the next match for this current match
      const currentStage = gender === 'boys' ? boys_stage_groups : girls_stage_groups;
      const nextMatchId = await createNextRoundMatch(
        championship_id, 
        sport_type, 
        gender, 
        currentStage
      );

      // Create the current match
      const { data: match, error } = await supabase
        .from('matches')
        .insert({
          team_a_id: parseInt(team_a_id),
          team_b_id: parseInt(team_b_id),
          championship_id: parseInt(championship_id),
          sport_type: sport_type,
          status: status,
          ...(gender === 'boys' ? { boys_stage_groups: boys_stage_groups } : { girls_stage_groups: girls_stage_groups }),
          next_match_id: nextMatchId ? parseInt(nextMatchId) : null,
        })
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
      console.log(`Next match ID: ${nextMatchId}`);
      
      // The next match creation is now handled intelligently in findOrCreateNextMatch
      // which will either link to an existing match or create a new one based on
      // how many other matches are pointing to the same next_match_id

      return NextResponse.json(
        { 
          message: 'Match created successfully',
          match,
          next_match_id: nextMatchId
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Prisma error:', error);
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

    // Build query for Supabase
    let query = supabase.from('matches').select('*');

    if (championship_id) {
      query = query.eq('championship_id', championship_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (gender) {
      // Filter by gender using stage groups
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

      // Build update object based on provided fields
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

      // If no fields to update, return error
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

      // If a winner was set and there's a next match, advance the winner
      if (winner_id && currentMatch.next_match_id) {
        const { data: nextMatch, error: nextMatchError } = await supabase
          .from('matches')
          .select('*')
          .eq('id', currentMatch.next_match_id)
          .single();

        if (nextMatch && !nextMatchError) {
          // Determine which slot to fill in the next match
          const updateNextMatch: any = {};
          
          if (!nextMatch.team_a_id) {
            updateNextMatch.team_a_id = parseInt(winner_id);
          } else if (!nextMatch.team_b_id) {
            updateNextMatch.team_b_id = parseInt(winner_id);
          }

          if (Object.keys(updateNextMatch).length > 0) {
            await supabase
              .from('matches')
              .update(updateNextMatch)
              .eq('id', currentMatch.next_match_id);
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
      console.error('Supabase error:', error);
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

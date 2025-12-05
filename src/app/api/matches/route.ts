import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Tournament status hierarchy based on your schema
const TOURNAMENT_STATUSES = {
  male: ['preliminary', 'semi-finals', 'finals'],
  female: ['preliminary', 'quarter-finals', 'semi-finals', 'finals']
};

// Helper function to convert between match gender (boys/girls) and team gender (male/female)
function matchGenderToTeamGender(matchGender: 'boys' | 'girls'): 'male' | 'female' {
  return matchGender === 'boys' ? 'male' : 'female';
}

function teamGenderToMatchGender(teamGender: 'male' | 'female'): 'boys' | 'girls' {
  return teamGender === 'male' ? 'boys' : 'girls';
}

function getNextStatus(currentStatus: string, gender: 'male' | 'female'): string | null {
  const statuses = TOURNAMENT_STATUSES[gender];
  const currentIndex = statuses.indexOf(currentStatus);
  return currentIndex !== -1 && currentIndex < statuses.length - 1 
    ? statuses[currentIndex + 1] 
    : null;
}

function isFinalRound(status: string): boolean {
  return status === 'finals';
}

async function findOrCreateNextMatch(
  championship_id: string,
  sport_type: string,
  gender: 'male' | 'female',
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
    
    // Build the correct stage field name
    const stageField = gender === 'male' ? 'boys_stage_groups' : 'girls_stage_groups';
    
    // Step 1: Get all existing next round matches
    const { data: existingNextMatches, error: searchError } = await supabase
      .from('matches')
      .select('id, team_a_id, team_b_id, next_match_id')
      .eq('championship_id', championship_id)
      .eq('sport_type', sport_type)
      .eq(stageField, nextStatus);

    if (searchError) {
      console.error('Error searching for existing next matches:', searchError);
    }

    // Step 2: Get all current round matches to count their next_match_id references
    const { data: allCurrentRoundMatches, error: allMatchesError } = await supabase
      .from('matches')
      .select('id, next_match_id')
      .eq('championship_id', championship_id)
      .eq('sport_type', sport_type)
      .eq(stageField, current_status)
      .not('next_match_id', 'is', null);

    if (allMatchesError) {
      console.error('Error fetching current round matches:', allMatchesError);
    }

    // Step 3: Count how many current round matches point to each next_match_id
    const nextMatchCounts = new Map<string, number>();
    if (allCurrentRoundMatches) {
      allCurrentRoundMatches.forEach(match => {
        if (match.next_match_id) {
          const id = match.next_match_id.toString();
          nextMatchCounts.set(id, (nextMatchCounts.get(id) || 0) + 1);
        }
      });
    }

    console.log('Next match usage counts:', Object.fromEntries(nextMatchCounts));

    // Step 4: Special handling for finals - there should only be ONE finals match
    if (isFinalRound(nextStatus)) {
      if (existingNextMatches && existingNextMatches.length > 0) {
        const finalsMatch = existingNextMatches[0];
        const currentCount = nextMatchCounts.get(finalsMatch.id.toString()) || 0;
        
        if (currentCount < 2) {
          console.log(`Found THE finals match ${finalsMatch.id} with ${currentCount} feeders - using it`);
          return finalsMatch.id.toString();
        } else {
          console.log(`Finals match already has 2 feeders - cannot add more`);
          return null;
        }
      }
      
      // No finals match exists, create THE ONLY finals match
      console.log(`Creating THE finals match for ${gender}`);
      const insertData: any = {
        championship_id: parseInt(championship_id),
        sport_type: sport_type,
        gender: gender, // Add gender field for next matches
        status: 'not_yet_scheduled',
        team_a_id: null,
        team_b_id: null,
        next_match_id: null, // Finals has no next match
      };

      if (gender === 'male') {
        insertData.boys_stage_groups = nextStatus;
      } else {
        insertData.girls_stage_groups = nextStatus;
      }

      const { data: newFinalsMatch, error: createError } = await supabase
        .from('matches')
        .insert(insertData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating finals match:', createError);
        return null;
      }

      console.log(`Created THE finals match: ${newFinalsMatch.id}`);
      return newFinalsMatch.id.toString();
    }

    // Step 5: For non-finals rounds, find a next match with less than 2 feeders
    if (existingNextMatches && existingNextMatches.length > 0) {
      for (const nextMatch of existingNextMatches) {
        const matchId = nextMatch.id.toString();
        const currentCount = nextMatchCounts.get(matchId) || 0;
        
        if (currentCount < 2) {
          console.log(`Found next match ${matchId} with ${currentCount} feeders - can accept one more`);
          return matchId;
        }
      }
      
      console.log('All existing next matches are full (have 2 feeders each)');
    }

    // Step 6: No suitable match found, create a new one
    console.log(`Creating new ${nextStatus} match for ${gender}`);
    
    // Recursively create the next match's next match (if not finals)
    const subsequentMatchId = !isFinalRound(nextStatus)
      ? await findOrCreateNextMatch(championship_id, sport_type, gender, nextStatus)
      : null;

    const insertData: any = {
      championship_id: parseInt(championship_id),
      sport_type: sport_type,
      gender: gender, // Add gender field for next matches
      status: 'not_yet_scheduled',
      team_a_id: null,
      team_b_id: null,
      next_match_id: subsequentMatchId ? parseInt(subsequentMatchId) : null,
    };

    // Set the appropriate stage field
    if (gender === 'male') {
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

async function validateTournamentIntegrity(
  supabase: any,
  championship_id: string,
  sport_type: string,
  gender: 'male' | 'female'
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];
  const stageField = gender === 'male' ? 'boys_stage_groups' : 'girls_stage_groups';

  try {
    // Check 1: Ensure only ONE finals match exists
    const { data: finalsMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('championship_id', championship_id)
      .eq('sport_type', sport_type)
      .eq(stageField, 'finals');

    if (finalsMatches && finalsMatches.length > 1) {
      issues.push(`Multiple finals matches found (${finalsMatches.length}) - there should only be ONE`);
    }

    // Check 2: Ensure no match has more than 2 feeders
    const { data: allMatches } = await supabase
      .from('matches')
      .select('id, next_match_id')
      .eq('championship_id', championship_id)
      .eq('sport_type', sport_type)
      .not('next_match_id', 'is', null);

    if (allMatches) {
      const nextMatchCounts = new Map<string, number>();
      allMatches.forEach((match: any) => {
        if (match.next_match_id) {
          const id = match.next_match_id.toString();
          nextMatchCounts.set(id, (nextMatchCounts.get(id) || 0) + 1);
        }
      });

      for (const [matchId, count] of nextMatchCounts.entries()) {
        if (count > 2) {
          issues.push(`Match ${matchId} has ${count} feeders - should have at most 2`);
        }
      }
    }

    // Check 3: Ensure finals matches have no next_match_id
    if (finalsMatches) {
      for (const finalsMatch of finalsMatches) {
        const { data: matchData } = await supabase
          .from('matches')
          .select('next_match_id')
          .eq('id', finalsMatch.id)
          .single();

        if (matchData && matchData.next_match_id !== null) {
          issues.push(`Finals match ${finalsMatch.id} has a next_match_id - finals should not have next matches`);
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  } catch (error) {
    console.error('Error validating tournament integrity:', error);
    return {
      valid: false,
      issues: ['Failed to validate tournament integrity']
    };
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
      gender = 'male',
      boys_stage_groups = 'preliminary',
      girls_stage_groups = 'preliminary'
    } = body;

    // Always set status to not_yet_scheduled for new matches
    const finalStatus = 'not_yet_scheduled';
    console.log('🔒 Setting status to:', finalStatus, '(always not_yet_scheduled for new matches)');

    if (!team_a_id || !team_b_id || !championship_id || !sport_type || !gender) {
      console.log('Missing required fields:', { team_a_id, team_b_id, championship_id, sport_type, gender });
      return NextResponse.json(
        { error: 'Team A ID, Team B ID, Championship ID, Sport Type, and Gender are required' },
        { status: 400 }
      );
    }

    if (!['male', 'female'].includes(gender)) {
      return NextResponse.json(
        { error: 'Gender must be either "male" or "female"' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
      // Get the current stage based on gender
      const currentStage = gender === 'male' ? boys_stage_groups : girls_stage_groups;
      
      // Validate that the stage is valid for the gender
      const validStages = TOURNAMENT_STATUSES[gender as 'male' | 'female'];
      if (!validStages.includes(currentStage)) {
        return NextResponse.json(
          { error: `Invalid stage "${currentStage}" for ${gender}. Valid stages: ${validStages.join(', ')}` },
          { status: 400 }
        );
      }

      // Check if this is a finals match - finals matches should not have next_match_id
      const isFinals = isFinalRound(currentStage);
      let nextMatchId: string | null = null;

      if (!isFinals) {
        // Find or create the next match
        nextMatchId = await findOrCreateNextMatch(
          championship_id, 
          sport_type, 
          gender, 
          currentStage
        );

        if (!nextMatchId && getNextStatus(currentStage, gender) !== null) {
          return NextResponse.json(
            { error: 'Failed to create or find next match. The tournament bracket may be full.' },
            { status: 500 }
          );
        }
      } else {
        console.log('Creating finals match - no next match needed');
      }

      // Prepare insert data - always set status to not_yet_scheduled for new matches
      const insertData: any = {
        team_a_id: parseInt(team_a_id),
        team_b_id: parseInt(team_b_id),
        championship_id: parseInt(championship_id),
        sport_type: sport_type,
        gender: gender, // Directly use male/female
        status: finalStatus, // Always 'not_yet_scheduled' for new matches
        next_match_id: nextMatchId ? parseInt(nextMatchId) : null,
      };

      // Set the appropriate stage field
      if (gender === 'male') {
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
      console.log(`Linked to next match ID: ${nextMatchId || 'none (finals)'}`);

      // Validate tournament integrity after creation
      const validation = await validateTournamentIntegrity(
        supabase,
        championship_id,
        sport_type,
        gender
      );

      if (!validation.valid) {
        console.warn('Tournament integrity issues detected:', validation.issues);
      }

      return NextResponse.json(
        { 
          message: 'Match created successfully',
          match,
          next_match_id: nextMatchId,
          integrity_check: validation
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
    const match_id = searchParams.get('match_id');
    const status = searchParams.get('status');
    const gender = searchParams.get('gender');
    const boys_stage_groups = searchParams.get('boys_stage_groups');
    const girls_stage_groups = searchParams.get('girls_stage_groups');
    const validate = searchParams.get('validate') === 'true';
    const ongoing_only = searchParams.get('ongoing_only') === 'true';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase.from('matches').select(`
      *,
      teamA:teams!team_a_id(id, name, grade, gender),
      teamB:teams!team_b_id(id, name, grade, gender),
      championship:championships(id, name, status)
    `);

    // Handle single match fetch by ID
    if (match_id) {
      query = query.eq('id', match_id);
      const { data: match, error } = await query.single();
      
      if (error) {
        console.error('Supabase error fetching match:', error);
        return NextResponse.json(
          { error: 'Failed to fetch match', details: error.message },
          { status: 500 }
        );
      }
      
      if (!match) {
        return NextResponse.json(
          { error: 'Match not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ match });
    }

    if (championship_id) {
      query = query.eq('championship_id', championship_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (gender) {
      query = query.eq('gender', gender);
    }

    if (boys_stage_groups) {
      query = query.eq('boys_stage_groups', boys_stage_groups);
    }

    if (girls_stage_groups) {
      query = query.eq('girls_stage_groups', girls_stage_groups);
    }

    // Filter by ongoing championships if requested
    if (ongoing_only) {
      console.log('🔍 Filtering matches by ongoing championships only');
      // First get all ongoing championship IDs
      const { data: ongoingChampionships, error: champError } = await supabase
        .from('championships')
        .select('id')
        .eq('status', 'ongoing');

      if (champError) {
        console.error('Error fetching ongoing championships:', champError);
        return NextResponse.json(
          { error: 'Failed to fetch ongoing championships', details: champError.message },
          { status: 500 }
        );
      }

      if (ongoingChampionships && ongoingChampionships.length > 0) {
        const ongoingIds = ongoingChampionships.map(c => c.id);
        console.log('🔍 Found ongoing championship IDs:', ongoingIds);
        query = query.in('championship_id', ongoingIds);
      } else {
        console.log('🔍 No ongoing championships found, returning empty result');
        // Use a condition that will never match to return empty results
        query = query.eq('championship_id', -1);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data: matches, error } = await query;

    // Debug logging for ongoing_only filter
    if (ongoing_only) {
      console.log('🔍 Ongoing filter debug:', {
        ongoing_only,
        totalMatches: matches?.length || 0,
        sampleMatches: matches?.slice(0, 3).map(m => ({
          id: m.id,
          championship_id: m.championship_id,
          championship_status: m.championship?.status,
          teamA: m.teamA?.name,
          teamB: m.teamB?.name
        })) || []
      });
    }

    if (error) {
      console.error('Supabase error fetching matches:', error);
      return NextResponse.json(
        { error: 'Failed to fetch matches', details: error.message },
        { status: 500 }
      );
    }

    // Optionally validate tournament integrity
    let validation = null;
    if (validate && championship_id && gender) {
      const sport_type = matches?.[0]?.sport_type;
      if (sport_type) {
        validation = await validateTournamentIntegrity(
          supabase,
          championship_id,
          sport_type,
          gender as 'male' | 'female'
        );
      }
    }

    return NextResponse.json({
      matches,
      ...(validation && { integrity_check: validation })
    });
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
    console.log('🔧 PATCH /api/matches - Request body:', body);
    
    const { match_id, match_time, status, winner_id, team_a_score, team_b_score } = body;

    if (!match_id) {
      console.log('❌ PATCH /api/matches - Missing match_id');
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }
    
    console.log('📋 PATCH /api/matches - Processing update for match:', match_id);
    console.log('📋 PATCH /api/matches - Update fields:', { match_time, status, winner_id, team_a_score, team_b_score });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
      // Get current match details
      console.log('🔍 PATCH /api/matches - Fetching current match details...');
      const { data: currentMatch, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', match_id)
        .single();

      if (fetchError || !currentMatch) {
        console.log('❌ PATCH /api/matches - Match not found:', fetchError);
        return NextResponse.json(
          { error: 'Match not found' },
          { status: 404 }
        );
      }
      
      console.log('✅ PATCH /api/matches - Current match found:', {
        id: currentMatch.id,
        status: currentMatch.status,
        team_a_id: currentMatch.team_a_id,
        team_b_id: currentMatch.team_b_id
      });

      // Validate winner is one of the teams in the match
      if (winner_id !== undefined) {
        const winnerId = parseInt(winner_id);
        if (winnerId !== currentMatch.team_a_id && winnerId !== currentMatch.team_b_id) {
          return NextResponse.json(
            { error: 'Winner must be one of the teams in the match' },
            { status: 400 }
          );
        }
      }

      // Build update object
      const updateData: any = {};
      
      if (match_time !== undefined) {
        updateData.match_time = match_time;
      }
      
      if (status !== undefined) {
        updateData.status = status;
        console.log('🔄 PATCH /api/matches - Updating status to:', status);
      }
      
      if (winner_id !== undefined) {
        updateData.winner_id = parseInt(winner_id);
      }
      
      if (team_a_score !== undefined) {
        updateData.team_a_score = parseInt(team_a_score);
      }
      
      if (team_b_score !== undefined) {
        updateData.team_b_score = parseInt(team_b_score);
      }

      console.log('📝 PATCH /api/matches - Update data:', updateData);

      if (Object.keys(updateData).length === 0) {
        console.log('❌ PATCH /api/matches - No fields to update');
        return NextResponse.json(
          { error: 'At least one field to update is required' },
          { status: 400 }
        );
      }

      // Update the current match
      console.log('💾 PATCH /api/matches - Updating match in database...');
      const { data: updatedMatch, error: updateError } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', match_id)
        .select('*')
        .single();

      if (updateError) {
        console.error('❌ PATCH /api/matches - Database update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update match', details: updateError.message },
          { status: 500 }
        );
      }
      
      console.log('✅ PATCH /api/matches - Match updated successfully:', {
        id: updatedMatch.id,
        status: updatedMatch.status,
        team_a_id: updatedMatch.team_a_id,
        team_b_id: updatedMatch.team_b_id
      });

      // If winner is set, update prediction scores
      if (winner_id !== undefined) {
        console.log(`Updating prediction scores for match ${match_id} with winner ${winner_id}`);
        
        // Get all predictions for this match
        const { data: predictions, error: fetchPredictionsError } = await supabase
          .from('predictions')
          .select('id, predicted_winner_id')
          .eq('match_id', match_id);

        if (fetchPredictionsError) {
          console.error('Error fetching predictions:', fetchPredictionsError);
        } else if (predictions) {
          // Update each prediction with correct/incorrect status
          for (const prediction of predictions) {
            const isCorrect = prediction.predicted_winner_id === parseInt(winner_id);
            const { error: updateError } = await supabase
              .from('predictions')
              .update({ is_correct: isCorrect })
              .eq('id', prediction.id);

            if (updateError) {
              console.error('Error updating prediction:', updateError);
            }
          }
          console.log(`Updated ${predictions.length} predictions`);
        }
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
            console.log(`Advancing winner ${winner_id} to team_a_id of next match ${currentMatch.next_match_id}`);
          } else if (!nextMatch.team_b_id) {
            updateNextMatch.team_b_id = parseInt(winner_id);
            console.log(`Advancing winner ${winner_id} to team_b_id of next match ${currentMatch.next_match_id}`);
          } else {
            console.warn('Warning: Next match already has both teams assigned');
            return NextResponse.json(
              { 
                message: 'Match updated successfully but winner could not be advanced - next match is full',
                match: updatedMatch 
              },
              { status: 200 }
            );
          }

          if (Object.keys(updateNextMatch).length > 0) {
            const { error: advanceError } = await supabase
              .from('matches')
              .update(updateNextMatch)
              .eq('id', currentMatch.next_match_id);

            if (advanceError) {
              console.error('Error advancing winner to next match:', advanceError);
              return NextResponse.json(
                { 
                  message: 'Match updated successfully but failed to advance winner',
                  match: updatedMatch,
                  error: advanceError.message
                },
                { status: 200 }
              );
            } else {
              console.log(`Winner ${winner_id} advanced to next match ${currentMatch.next_match_id}`);
            }
          }
        }
      }

      console.log('🎉 PATCH /api/matches - Returning success response');
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

export async function DELETE(request: NextRequest) {
  console.log('🗑️ Match deletion request received');
  
  try {
    const { searchParams } = new URL(request.url);
    const match_id = searchParams.get('match_id');
    
    console.log('📦 Match ID:', match_id);

    if (!match_id) {
      console.log('❌ Validation failed: Match ID is required');
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    console.log('🔧 Creating Supabase admin client...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('💾 Deleting match from database...');
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', match_id);

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: 'Failed to delete match', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Match deleted successfully');
    return NextResponse.json(
      { message: 'Match deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('💥 Unexpected error in match deletion:', error);
    return NextResponse.json(
      { error: 'Failed to delete match', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
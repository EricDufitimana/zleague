import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  console.log('🎯 Prediction submission request received');
  
  try {
    const body = await request.json();
    console.log('📦 Request body:', body);
    
    const { match_id, predicted_winner_id, user_id } = body;
    console.log('🔍 Parsed data:', { match_id, predicted_winner_id, user_id });

    if (!match_id || !predicted_winner_id || !user_id) {
      console.log('❌ Validation failed: Missing required fields');
      return NextResponse.json(
        { error: 'Match ID, predicted winner ID, and user ID are required' },
        { status: 400 }
      );
    }

    console.log('✅ Validation passed');
    console.log('🔧 Creating Supabase admin client...');
    const supabase = createAdminClient();

    // Check if user already has a prediction for this match
    console.log(`🔍 Checking for existing prediction: match_id=${match_id}, user_id=${user_id}`);
    const { data: existingPrediction, error: checkError } = await supabase
      .from('predictions')
      .select('id')
      .eq('match_id', match_id)
      .eq('user_id', user_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing prediction:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing prediction' },
        { status: 500 }
      );
    }

    if (existingPrediction) {
      console.log('⚠️ User already has a prediction for this match:', existingPrediction);
      return NextResponse.json(
        { error: 'You have already made a prediction for this match' },
        { status: 400 }
      );
    }

    console.log('✅ No existing prediction found, proceeding with insertion');
    console.log('💾 Inserting new prediction...');
    
    // Insert new prediction
    const { data: prediction, error: insertError } = await supabase
      .from('predictions')
      .insert({
        match_id: parseInt(match_id),
        predicted_winner_id: parseInt(predicted_winner_id),
        user_id: parseInt(user_id),
        is_correct: null // Will be updated when match result is known
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating prediction:', insertError);
      console.error('❌ Error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      return NextResponse.json(
        { error: 'Failed to create prediction' },
        { status: 500 }
      );
    }

    console.log('✅ Prediction created successfully:', prediction);
    return NextResponse.json(
      { 
        message: 'Prediction submitted successfully',
        prediction 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('💥 Unexpected error in predictions POST:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to submit prediction' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log('📊 Predictions fetch request received');
  
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const match_id = searchParams.get('match_id');
    
    console.log('🔍 Query parameters:', { user_id, match_id });

    console.log('🔧 Creating Supabase admin client...');
    const supabase = createAdminClient();

    console.log('📋 Building query...');
    let query = supabase.from('predictions').select(`
      *,
      match:matches(
        id,
        championship_id,
        team_a_id,
        team_b_id,
        winner_id,
        status,
        match_time,
        teamA:teams!team_a_id(name),
        teamB:teams!team_b_id(name),
        championship:championships(id, status)
      ),
      user:users(first_name, last_name, username)
    `);

    if (user_id) {
      console.log(`🔍 Filtering by user_id: ${user_id}`);
      query = query.eq('user_id', user_id);
    }

    if (match_id) {
      console.log(`🔍 Filtering by match_id: ${match_id}`);
      query = query.eq('match_id', match_id);
    }

    console.log('🚀 Executing query...');
    const { data: predictions, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching predictions:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { error: 'Failed to fetch predictions' },
        { status: 500 }
      );
    }
    
    // Filter predictions to only include those from ongoing championships
    const filteredPredictions = predictions?.filter((pred: any) => {
      return pred.match?.championship?.status === 'ongoing';
    }) || [];

    console.log(`✅ Successfully fetched ${filteredPredictions.length} predictions (filtered to ongoing championships)`);
    console.log('📊 Predictions data:', filteredPredictions);
    
    return NextResponse.json({ predictions: filteredPredictions });
  } catch (error) {
    console.error('💥 Unexpected error in predictions GET:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}

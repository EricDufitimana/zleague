import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient as createSessionClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const session = await createSessionClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in before submitting a prediction.' }, { status: 401 });
    const { match_id, predicted_winner_id } = await request.json();
    const matchId = Number(match_id), winnerId = Number(predicted_winner_id);
    if (!Number.isSafeInteger(matchId) || matchId <= 0 || !Number.isSafeInteger(winnerId) || winnerId <= 0) return NextResponse.json({ error: 'Choose a valid match and family.' }, { status: 400 });
    const db = createAdminClient();
    const { data: profile, error: profileError } = await db.from('users').select('id').eq('user_id', user.id).single();
    if (profileError || !profile) return NextResponse.json({ error: 'Your league profile could not be found. Please sign in again.' }, { status: 403 });
    const { data: match, error: matchError } = await db.from('matches').select('id,status,match_time,team_a_id,team_b_id,championship:championships(status)').eq('id', matchId).single();
    if (matchError || !match) return NextResponse.json({ error: 'This match could not be found.' }, { status: 404 });
    const championship = match.championship as unknown as { status: string } | null;
    if (!['scheduled', 'not_yet_scheduled'].includes(match.status) || championship?.status !== 'ongoing' || (match.match_time && Date.parse(match.match_time) <= Date.now())) return NextResponse.json({ error: 'Predictions have closed for this match.' }, { status: 409 });
    if (!match.team_a_id || !match.team_b_id || ![match.team_a_id, match.team_b_id].includes(winnerId)) return NextResponse.json({ error: 'Choose one of the families playing this match.' }, { status: 400 });
    const { data: existing, error: lookupError } = await db.from('predictions').select('id').eq('match_id', matchId).eq('user_id', profile.id).limit(1);
    if (lookupError) throw lookupError;
    if (existing?.length) return NextResponse.json({ error: 'You already submitted a prediction for this match.' }, { status: 409 });
    const { data: prediction, error } = await db.from('predictions').insert({ match_id: matchId, predicted_winner_id: winnerId, user_id: profile.id, is_correct: null }).select().single();
    if (error?.code === '23505') return NextResponse.json({ error: 'You already submitted a prediction for this match.' }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ prediction }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Could not submit your prediction. Please try again.' }, { status: 500 }); }
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

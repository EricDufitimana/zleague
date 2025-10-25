import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const { player_id, stat_type, value, match_id } = await request.json();

    if (!player_id || !stat_type || value === undefined || !match_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Update player stats for the specific match
    const { data, error } = await supabase
      .from('player_match_stats')
      .upsert({
        player_id,
        match_id,
        [stat_type]: value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'player_id,match_id'
      })
      .select();

    if (error) {
      console.error('Error updating player stats:', error);
      return NextResponse.json(
        { error: 'Failed to update player stats' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in PATCH /api/players/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

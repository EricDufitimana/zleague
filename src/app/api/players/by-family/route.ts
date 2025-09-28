import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get players grouped by family
    const { data: players, error } = await supabase
      .from('players')
      .select('family')
      .not('family', 'is', null);

    if (error) {
      console.error('Error fetching players by family:', error);
      return NextResponse.json({ error: 'Failed to fetch players by family' }, { status: 500 });
    }

    // Count players by family
    const familyCounts: { [family: string]: number } = {};
    players?.forEach(player => {
      if (player.family) {
        familyCounts[player.family] = (familyCounts[player.family] || 0) + 1;
      }
    });

    return NextResponse.json(familyCounts);
  } catch (error) {
    console.error('Error in players by family API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

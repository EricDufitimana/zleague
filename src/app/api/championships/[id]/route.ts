import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  console.log('🏆 Championship API - GET request received');
  console.log('🌐 Request URL:', request.url);
  console.log('📡 Request method:', request.method);
  console.log('🕐 Timestamp:', new Date().toISOString());
  
  try {
    const params = await context.params;
    const id = params.id;
    console.log('🏷️ Championship ID from params:', id);
    console.log('🏷️ Championship ID type:', typeof id);
    
    if (!id || isNaN(parseInt(id as string))) {
      console.log('❌ Validation failed: Invalid championship ID');
      return NextResponse.json({ error: 'Invalid championship ID' }, { status: 400 });
    }

    console.log('🔧 Using Supabase client...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('📊 Fetching championship from database...');
    const { data: championship, error } = await supabase
      .from('championships')
      .select('*')
      .eq('id', parseInt(id as string))
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      if (error.code === 'PGRST116') {
        console.log('❌ Championship not found');
        return NextResponse.json({ error: 'Championship not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Failed to fetch championship', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Championship fetched successfully:', championship);
    return NextResponse.json(championship);
  } catch (error) {
    console.error('💥 Unexpected error in championship API:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

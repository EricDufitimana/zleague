import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  console.log('👤 Users fetch request received');
  
  try {
    const { searchParams } = new URL(request.url);
    const auth_user_id = searchParams.get('auth_user_id');
    const user_id = searchParams.get('user_id');
    
    console.log('🔍 Query parameters:', { auth_user_id, user_id });

    console.log('🔧 Creating Supabase admin client...');
    const supabase = createAdminClient();

    console.log('📋 Building query...');
    let query = supabase.from('users').select('*');

    if (auth_user_id) {
      console.log(`🔍 Filtering by auth_user_id: ${auth_user_id}`);
      query = query.eq('user_id', auth_user_id);
    }

    if (user_id) {
      console.log(`🔍 Filtering by user_id: ${user_id}`);
      query = query.eq('id', user_id);
    }

    console.log('🚀 Executing query...');
    const { data: users, error } = await query;

    if (error) {
      console.error('❌ Error fetching users:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully fetched ${users?.length || 0} users`);
    console.log('👤 Users data:', users);
    
    // Return single user if filtering by auth_user_id or user_id
    if (auth_user_id || user_id) {
      return NextResponse.json({ user: users?.[0] || null });
    }
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('💥 Unexpected error in users GET:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

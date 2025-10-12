import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 user-profile API: Starting request')
    
    // Get userId from query parameters
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      console.log('❌ user-profile API: No userId provided')
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      )
    }

    console.log('✅ user-profile API: userId provided', { userId })
    
    const supabase = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user details from users table
    console.log('🔍 user-profile API: Checking users table for userId:', userId)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (userError) {
      // User not found in users table
      console.log('❌ user-profile API: User not found in users table', { userError, userId })
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      )
    }

    console.log('✅ user-profile API: User found in database', { 
      userId: userData.user_id, 
      role: userData.role,
      username: userData.username 
    })

    // Get user email from auth table using admin client
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(userId)
    
    if (authError) {
      console.log('❌ user-profile API: Error getting auth user', { authError, userId })
    }

    const userEmail = authUser?.user?.email || 'no-email@zleague.com'
    const avatarUrl = authUser?.user?.user_metadata?.avatar_url || userData.avatar_url || '/avatars/default.jpg'

    console.log('✅ user-profile API: Got auth user data', { 
      email: userEmail,
      hasAvatar: !!avatarUrl
    })

    const responseData = {
      user: userData,
      name: userData.first_name && userData.last_name ? `${userData.first_name} ${userData.last_name}` : userData.username || 'User',
      email: userEmail,
      avatar: avatarUrl,
    }

    console.log('✅ user-profile API: Returning user data', { 
      hasUser: !!responseData.user,
      role: responseData.user?.role,
      name: responseData.name 
    })

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('❌ user-profile API: Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


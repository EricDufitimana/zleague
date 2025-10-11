import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user from Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Try to get user details from admins table first
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .single()

    let firstName = ''
    let lastName = ''

    if (adminData && !adminError) {
      firstName = adminData.first_name
      lastName = adminData.last_name
    } else {
      // Try users table if not found in admins
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single()

      if (usersData && !usersError) {
        firstName = usersData.first_name
        lastName = usersData.last_name
      }
    }

    // Get user metadata for avatar if available
    const avatarUrl = user.user_metadata?.avatar_url || '/avatars/default.jpg'

    const userData = {
      name: firstName && lastName ? `${firstName} ${lastName}` : user.email?.split('@')[0] || 'User',
      email: user.email || 'no-email@zleague.com',
      avatar: avatarUrl,
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


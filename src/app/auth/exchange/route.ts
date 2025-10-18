import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // 'login' or 'register'
  
  console.log('🔍 Exchange route called:', { code: code ? 'present' : 'missing', type, origin })
  
  // Determine redirect based on type
  const next = type === 'login' ? '/auth/login-callback' : '/auth/callback'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('🔄 Code exchange result:', { error: error?.message || 'success' })
    
    if (!error) {
      const isLocalEnv = process.env.NODE_ENV === 'development'
      const redirectUrl = isLocalEnv 
        ? `${origin}${next}` 
        : `${process.env.NEXT_PUBLIC_SITE_URL || origin}${next}`
      
      console.log('✅ Redirecting to:', redirectUrl)
      return NextResponse.redirect(redirectUrl)
    } else {
      console.error('❌ Code exchange failed:', error)
    }
  } else {
    console.log('❌ No code parameter found')
  }

  // return the user to an error page with instructions
  console.log('❌ Redirecting to error page')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

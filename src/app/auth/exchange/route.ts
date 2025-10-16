import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  
  // Get origin from environment or request headers
  const origin = process.env.NEXT_PUBLIC_APP_URL || 
    `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
  
  const next = type === 'login' ? '/auth/login-callback' : '/auth/callback'
  
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

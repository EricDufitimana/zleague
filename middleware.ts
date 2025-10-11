import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  console.log('🟢 ROOT MIDDLEWARE CALLED:', request.nextUrl.pathname)
  console.error('🟢 ROOT MIDDLEWARE CALLED (ERROR LOG):', request.nextUrl.pathname)
  
  const response = await updateSession(request)
  
  // Add a header to prove middleware ran
  response.headers.set('x-middleware-executed', 'true')
  response.headers.set('x-middleware-path', request.nextUrl.pathname)
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
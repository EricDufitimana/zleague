import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  console.log('🔵 [Middleware] ========== START ==========')
  console.log('🔵 [Middleware] Request URL:', request.nextUrl.pathname)
  console.log('🔵 [Middleware] Request method:', request.method)
  
  let supabaseResponse = NextResponse.next({
    request,
  })

  console.log('🔵 [Middleware] Creating Supabase client...')
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          console.log('🔵 [Middleware] Setting cookies:', cookiesToSet.map(c => c.name).join(', '))
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  console.log('🔵 [Middleware] Fetching user from Supabase...')
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('🔵 [Middleware] User fetched:', user ? `User ID: ${user.id}, Email: ${user.email}` : 'No user (unauthenticated)')

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/error') &&
    !request.nextUrl.pathname.startsWith('/register')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    console.log('🟡 [Middleware] No user found, redirecting to /login')
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (!user) {
    console.log('🔵 [Middleware] No user but on public route, allowing access')
  }

  // Check for admin access on dashboard routes
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    console.log('🔵 [Middleware] Dashboard route detected, checking admin access...')
    console.log('🔵 [Middleware] Querying user role from database for user:', user.id)
    
    // Create admin client with SERVICE_ROLE_KEY to bypass RLS policies
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    try {
      // Fetch user's role from the database using admin client
      const { data: userData, error: roleError } = await adminClient
        .from('users')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (roleError) {
        console.log('🔴 [Middleware] Error fetching user role:', roleError.message)
        console.log('🔴 [Middleware] Error details:', JSON.stringify(roleError))
      } else {
        console.log('🔵 [Middleware] User role:', userData?.role || 'No role found')
      }

      // If user is not an admin, redirect to home page
      if (!userData || userData.role !== 'admin') {
        console.log('🟡 [Middleware] User is not admin, redirecting to /')
        const url = request.nextUrl.clone()
        url.pathname = '/'
        console.log('🟡 [Middleware] Redirect URL:', url.toString())
        return NextResponse.redirect(url)
      }
      
      console.log('✅ [Middleware] User is admin, allowing access to dashboard')
    } catch (error) {
      console.log('❌ [Middleware] Exception during admin check:', error)
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  console.log('✅ [Middleware] Request allowed, returning response')
  console.log('🔵 [Middleware] ========== END ==========\n')
  return supabaseResponse
}
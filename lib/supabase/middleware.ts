import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/admin/login'
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  let isAdmin = false

  if (user?.email) {
    const admin = createAdminClient(
      SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data, error } = await admin
      .from('admin_users')
      .select('email')
      .eq('email', user.email)
      .eq('is_active', true)
      .maybeSingle()
    if (error) {
      console.error('admin_users lookup failed in middleware:', error.message)
    }
    isAdmin = !!data
  }

  if (isAdminRoute && !isLoginPage && (!user || !isAdmin)) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    if (user && !isAdmin) url.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(url)
  }

  if (isLoginPage && user && isAdmin) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'

// Read the `aal` (authenticator assurance level) claim from a Supabase access
// token. The token was already validated by getUser(); we only need to inspect
// a claim, so an unverified base64url decode of the payload is sufficient.
function readAal(accessToken: string): string | null {
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return null
    const json = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    )
    return typeof json.aal === 'string' ? json.aal : null
  } catch {
    return null
  }
}

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

  const path = request.nextUrl.pathname
  const isLoginPage = path === '/admin/login'
  const isAdminRoute = path.startsWith('/admin')

  // Admin authorization (row in admin_users, still active). Only needed on
  // /admin routes, so the client portal doesn't pay for a service-role lookup.
  let isAdmin = false
  if (isAdminRoute && user?.email) {
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

  // Step-up MFA enforcement: if the account has a verified TOTP factor but the
  // current session is still AAL1 (password only), force a TOTP challenge
  // before any protected page loads. Without this, enrolling 2FA would provide
  // no protection — a password-only session would keep full access. The
  // challenge page (/auth/verify) sits outside this matcher, so it stays
  // reachable at AAL1 to complete the step-up.
  if (user && !isLoginPage) {
    const hasVerifiedFactor = (user.factors ?? []).some((f) => f.status === 'verified')
    if (hasVerifiedFactor) {
      const { data: { session } } = await supabase.auth.getSession()
      const aal = session?.access_token ? readAal(session.access_token) : null
      if (aal !== 'aal2') {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/verify'
        url.search = ''
        url.searchParams.set('next', path + (request.nextUrl.search || ''))
        return NextResponse.redirect(url)
      }
    }
  }

  if (isLoginPage && user && isAdmin) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

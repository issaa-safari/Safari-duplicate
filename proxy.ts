import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // OAuth safety net. On the PKCE flow Supabase appends `?code=` to the redirect
  // target it lands on. If the exact `/auth/callback` URL isn't in the project's
  // allowed Redirect URLs, Supabase falls back to the Site URL (`/`), where no
  // route exchanges the code and the sign-in silently dies. Forward any stray
  // auth code from the homepage to the callback route, which owns the exchange.
  if (pathname === '/' && searchParams.has('code') && !searchParams.has('error')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }

  // Session gating and cookie refresh only apply to the protected areas.
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    return await updateSession(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/admin/:path*', '/dashboard/:path*'],
}

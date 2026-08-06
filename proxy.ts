import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { LOCALE_HEADER } from '@/lib/i18n'
import { isUnlocalised, localePath, splitLocalePath } from '@/lib/locale'

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

  // Strip the locale before anything else looks at the path, so a prefixed URL
  // can never route differently from its unprefixed twin.
  const { locale, path } = splitLocalePath(pathname)

  // Single-language areas never take a prefix. Bouncing rather than rewriting
  // matters for two reasons: /ar/dashboard would otherwise skip the session
  // gate below, and /ar/privacy would serve English text in a lang="ar"
  // document.
  if (locale !== 'en' && isUnlocalised(path)) {
    const url = request.nextUrl.clone()
    url.pathname = path
    return NextResponse.redirect(url, 308)
  }

  // Session gating and cookie refresh only apply to the protected areas.
  if (path.startsWith('/admin') || path.startsWith('/dashboard')) {
    return await updateSession(request)
  }

  // Language used to be a query parameter, so one URL served two languages —
  // invisible to crawlers, and duplicate content wherever it was visible.
  // Send those links to the canonical localised path, once and permanently.
  const legacyLang = searchParams.get('lang')
  if (legacyLang === 'ar' || legacyLang === 'en') {
    const url = request.nextUrl.clone()
    url.searchParams.delete('lang')
    url.pathname = localePath(path, legacyLang)
    return NextResponse.redirect(url, 308)
  }

  // /ar/tours renders the shared /tours route with the locale carried on a
  // request header. Rewriting rather than redirecting keeps the Arabic URL in
  // the address bar, and in the index.
  if (locale === 'ar') {
    const url = request.nextUrl.clone()
    url.pathname = path
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(LOCALE_HEADER, 'ar')
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  return NextResponse.next()
}

export const config = {
  // Everything except Next internals, the API, and paths with a file extension.
  // The locale prefix and the ?lang= redirect have to see ordinary page routes,
  // which the previous three-entry matcher never did.
  matcher: ['/((?!_next/static|_next/image|api/|.*\\.[\\w]+$).*)'],
}

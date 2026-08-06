import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { LOCALE_HEADER } from '@/lib/i18n'
import {
  LOCALE_COOKIE,
  isNegotiable,
  isUnlocalised,
  localePath,
  preferredLocale,
  splitLocalePath,
} from '@/lib/locale'

// A year. The visitor has told us what they read; there is no reason to ask again.
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

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

  // Single-language areas never take a prefix: /ar/privacy would serve English
  // text inside a lang="ar" document.
  if (locale !== 'en' && isUnlocalised(path)) {
    const url = request.nextUrl.clone()
    url.pathname = path
    return NextResponse.redirect(url, 308)
  }

  // /ar/tours renders the shared /tours route with the locale carried on a
  // request header. Rewriting rather than redirecting keeps the Arabic URL in
  // the address bar, and in the index.
  const rewriteToArabic = () => {
    const url = request.nextUrl.clone()
    url.pathname = path
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set(LOCALE_HEADER, 'ar')
    const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    // Arriving at an Arabic URL is itself a choice — whether it came from the
    // toggle, a link a friend sent, or a bookmark. Remember it, so detection
    // does not later send the visitor somewhere else. Only when nothing is
    // stored: an explicit switch to English must never be overwritten.
    if (!request.cookies.has(LOCALE_COOKIE)) {
      response.cookies.set(LOCALE_COOKIE, 'ar', {
        path: '/',
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: 'lax',
      })
    }
    return response
  }

  // Language used to be a query parameter, so one URL served two languages —
  // invisible to crawlers, and duplicate content wherever it was visible.
  // Send those links to the canonical localised path, once and permanently.
  // An explicit ?lang= is a choice, so it is honoured before any detection and
  // remembered like one made with the toggle.
  // Prefetches are excluded here too: a prefetched ?lang= link would otherwise
  // redirect *and* write the cookie, pinning a visitor's language to a link
  // they never clicked.
  const negotiable = isNegotiable(searchParams.has('_rsc'))
  const legacyLang = searchParams.get('lang')
  if (negotiable && (legacyLang === 'ar' || legacyLang === 'en')) {
    const url = request.nextUrl.clone()
    url.searchParams.delete('lang')
    url.pathname = localePath(path, legacyLang)
    const response = NextResponse.redirect(url, 308)
    response.cookies.set(LOCALE_COOKIE, legacyLang, {
      path: '/',
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: 'lax',
    })
    return response
  }

  // No stored choice: serve the language the visitor's browser asks for, or
  // failing that the one their location suggests. Once only — the cookie below
  // means a visitor who then switches to English is never bounced again.
  //
  // Deciding here rather than after hydration matters: the old client-side
  // redirect painted the English page first, and a crawler, which never runs
  // it, saw only English at every address.
  //
  // Only ever on a real document request. Next prefetches every visible link,
  // so on an Arabic page the toggle's own /tours prefetch would be negotiated
  // back to /ar/tours, and the router would cache that redirect — clicking EN
  // then reloaded the Arabic page and the toggle looked dead. Any client-side
  // navigation reaching here already had its document request negotiated, so
  // the cookie is set and there is nothing left to decide.
  if (locale === 'en' && negotiable && !isUnlocalised(path) && !request.cookies.has(LOCALE_COOKIE)) {
    const detected = preferredLocale(
      request.headers.get('accept-language'),
      request.headers.get('x-vercel-ip-country')
    )
    if (detected === 'ar') {
      const url = request.nextUrl.clone()
      url.pathname = localePath(path, 'ar')
      // 307, not 308: this is a guess about the visitor, not a statement that
      // the English URL has moved.
      const response = NextResponse.redirect(url, 307)
      response.cookies.set(LOCALE_COOKIE, 'ar', {
        path: '/',
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: 'lax',
      })
      return response
    }
  }

  // Session gating and cookie refresh only apply to the protected areas. The
  // gate runs on the locale-stripped path, and the Arabic dashboard still has
  // to be rewritten onto the shared route — so the two are composed rather
  // than one short-circuiting the other.
  if (path.startsWith('/admin') || path.startsWith('/dashboard')) {
    return await updateSession(request, locale === 'ar' ? rewriteToArabic : undefined)
  }

  if (locale === 'ar') return rewriteToArabic()

  return NextResponse.next()
}

export const config = {
  // Everything except Next internals, the API, and paths with a file extension.
  // The locale prefix and the ?lang= redirect have to see ordinary page routes,
  // which the previous three-entry matcher never did.
  matcher: ['/((?!_next/static|_next/image|api/|.*\\.[\\w]+$).*)'],
}

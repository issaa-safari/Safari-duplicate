// Pure locale helpers, safe to import from both server and client components —
// this module deliberately pulls in nothing from next/headers.
//
// The URL is the single source of truth for language: Arabic lives under an
// /ar prefix, English at the bare path. One address renders one language, so a
// crawler and a visitor always see the same thing at the same URL — which is
// the whole point of the prefix, and why the locale cookie no longer decides
// what a page renders.

export type Locale = 'en' | 'ar'

export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALES: readonly Locale[] = ['en', 'ar']

/** URL segment for the non-default locale, without a trailing slash. */
export const AR_PREFIX = '/ar'

export function isLocale(v: unknown): v is Locale {
  return v === 'en' || v === 'ar'
}

export const dir = (l: Locale): 'rtl' | 'ltr' => (l === 'ar' ? 'rtl' : 'ltr')

/**
 * Areas that exist in one language only: the back office, the client dashboard,
 * token-scoped client documents, and the untranslated legal pages. Prefixing
 * these would serve English text inside a lang="ar" document, so they stay
 * unprefixed — and proxy.ts redirects the prefixed forms back here.
 */
export const UNLOCALISED_PREFIXES = [
  '/admin',
  '/dashboard',
  '/auth',
  '/quote',
  '/agreement',
  '/voucher',
  '/book',
  '/privacy',
  '/terms',
  '/offline',
] as const

export function isUnlocalised(path: string): boolean {
  return UNLOCALISED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
}

/**
 * Prefix a site-relative path for the given locale. English is unprefixed, so
 * existing English URLs keep the equity they have already earned. Paths outside
 * the bilingual marketing site are returned untouched, which keeps every call
 * site correct without each one having to remember the exceptions.
 */
export function localePath(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (locale !== 'ar' || isUnlocalised(clean)) return clean
  return clean === '/' ? AR_PREFIX : `${AR_PREFIX}${clean}`
}

/**
 * Split a request path into its locale and the underlying route. proxy.ts uses
 * this to rewrite /ar/tours onto the shared /tours route tree.
 */
export function splitLocalePath(pathname: string): { locale: Locale; path: string } {
  if (pathname === AR_PREFIX) return { locale: 'ar', path: '/' }
  if (pathname.startsWith(`${AR_PREFIX}/`)) {
    return { locale: 'ar', path: pathname.slice(AR_PREFIX.length) }
  }
  return { locale: DEFAULT_LOCALE, path: pathname }
}

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

/** Where an explicit choice from the language toggle is remembered. */
export const LOCALE_COOKIE = 'locale'

/**
 * Areas that exist in one language only: the back office, token-scoped client
 * documents, and the untranslated legal pages. Prefixing these would serve
 * English text inside a lang="ar" document, so they stay unprefixed — and
 * proxy.ts redirects the prefixed forms back here.
 *
 * The client dashboard is deliberately *not* here: it is fully translated, so
 * it lives at /ar/dashboard like the rest of the bilingual site.
 */
export const UNLOCALISED_PREFIXES = [
  '/admin',
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

/**
 * Whether a request is a top-level document load, as opposed to one of the RSC
 * payload fetches Next fires for every visible link.
 *
 * Language negotiation must only ever act on the former. Next prefetches links
 * eagerly, so negotiating a prefetch of the English URL from an Arabic page
 * redirects it — and the router caches that redirect, which made the language
 * toggle reload the page it was on.
 *
 * Next strips the RSC request header before middleware runs, so the tells are
 * the `_rsc` query parameter Next appends and Sec-Fetch-Dest. A client too old
 * to send Sec-Fetch-Dest is still treated as a document: absent is not the same
 * as "not a document".
 */
export function isDocumentNavigation(secFetchDest: string | null, hasRscParam: boolean): boolean {
  if (hasRscParam) return false
  return secFetchDest === null || secFetchDest === 'document'
}

/** Countries where a visitor is far more likely to want Arabic than English. */
const ARABIC_COUNTRIES = new Set([
  'AE', 'BH', 'DJ', 'DZ', 'EG', 'IQ', 'JO', 'KM', 'KW', 'LB', 'LY', 'MA',
  'MR', 'OM', 'PS', 'QA', 'SA', 'SD', 'SO', 'SY', 'TN', 'YE',
])

/** Language tags from an Accept-Language header, best-preferred first. */
function acceptedLanguages(header: string | null): string[] {
  if (!header) return []
  return header
    .split(',')
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='))
      const parsed = q ? Number.parseFloat(q.slice(2)) : 1
      // Index breaks ties so equal-quality tags keep the order they were sent.
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(parsed) ? parsed : 0, i }
    })
    .filter((l) => l.tag !== '' && l.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i)
    .map((l) => l.tag)
}

/**
 * Which language to serve a visitor who has not chosen one.
 *
 * The browser's own setting decides it wherever it says anything about Arabic
 * or English — someone who asked for English gets English regardless of where
 * they are connecting from, which also keeps crawlers on the English site.
 * Location is consulted only when the header is silent or lists neither.
 */
export function preferredLocale(acceptLanguage: string | null, country?: string | null): Locale {
  for (const tag of acceptedLanguages(acceptLanguage)) {
    const base = tag.split('-')[0]
    if (base === 'ar') return 'ar'
    if (base === 'en') return 'en'
  }
  if (country && ARABIC_COUNTRIES.has(country.toUpperCase())) return 'ar'
  return DEFAULT_LOCALE
}

import { headers } from 'next/headers'
import { isLocale, type Locale } from '@/lib/locale'

export type { Locale }
export { isLocale, dir } from '@/lib/locale'

// proxy.ts strips the /ar prefix and forwards the locale on this header, so a
// rewritten request still knows which language it is.
export const LOCALE_HEADER = 'x-locale'

/**
 * Locale of the requested URL. Reads only the header set by proxy.ts, so the
 * document language always matches the address — never a cookie, which would
 * let one URL render two languages and split it across search results.
 */
export async function getPathLocale(): Promise<Locale> {
  try {
    const store = await headers()
    const value = store.get(LOCALE_HEADER)
    return isLocale(value) ? value : 'en'
  } catch {
    // headers() is unavailable in some rendering contexts — fall through
    return 'en'
  }
}

/**
 * Resolve the active locale for a server component.
 *
 * Legacy ?lang=ar links are redirected to /ar by proxy.ts, so the searchParams
 * branch below is only a safety net for a render that bypassed that redirect.
 */
export async function getServerLocale(searchParams?: { lang?: string }): Promise<Locale> {
  const fromPath = await getPathLocale()
  if (fromPath === 'ar') return 'ar'
  return isLocale(searchParams?.lang) ? searchParams.lang : 'en'
}

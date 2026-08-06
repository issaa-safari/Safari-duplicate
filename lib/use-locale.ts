'use client'

import { usePathname } from 'next/navigation'
import { splitLocalePath, type Locale } from '@/lib/locale'

export type { Locale }

/**
 * Client-side locale resolver for client components (header, footer, forms).
 *
 * Mirrors getServerLocale: the path decides. This used to read ?lang= and the
 * locale cookie inside an effect, which meant a client component could render
 * a different language from the server output on the very same URL, and always
 * flashed English on first paint. Reading the path is synchronous and agrees
 * with the server by construction.
 */
export function useLocale(): Locale {
  const pathname = usePathname()
  return splitLocalePath(pathname ?? '/').locale
}

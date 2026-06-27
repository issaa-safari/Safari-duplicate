'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export type Locale = 'en' | 'ar'

/**
 * Client-side locale resolver for client components (header, footer, forms).
 * Mirrors getServerLocale: ?lang= param wins, then the persisted cookie, then English.
 * Also keeps the cookie in sync so server-rendered pages stay on the same language.
 */
export function useLocale(): Locale {
  const searchParams = useSearchParams()
  const [locale, setLocale] = useState<Locale>('en')

  useEffect(() => {
    const param = searchParams.get('lang')
    if (param === 'ar' || param === 'en') {
      setLocale(param)
      document.cookie = `locale=${param};path=/;max-age=31536000;samesite=lax`
      return
    }
    const m = document.cookie.match(/(?:^|;\s*)locale=(ar|en)/)
    if (m) {
      setLocale(m[1] as Locale)
      return
    }
    // First visit with no choice: auto-detect Arabic for Saudi / Arabic browsers
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
      const browser = navigator.language.split('-')[0]
      if (tz.includes('Riyadh') || tz.includes('Mecca') || browser === 'ar') {
        setLocale('ar')
        document.cookie = `locale=ar;path=/;max-age=31536000;samesite=lax`
      }
    } catch {
      // ignore
    }
  }, [searchParams])

  return locale
}

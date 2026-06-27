import { cookies } from 'next/headers'

export type Locale = 'en' | 'ar'

export function isLocale(v: unknown): v is Locale {
  return v === 'en' || v === 'ar'
}

/**
 * Resolve the active locale for a server component.
 * Priority: explicit ?lang= URL param  →  persisted `locale` cookie  →  English.
 */
export async function getServerLocale(searchParams?: { lang?: string }): Promise<Locale> {
  if (isLocale(searchParams?.lang)) return searchParams!.lang as Locale
  try {
    const store = await cookies()
    const v = store.get('locale')?.value
    if (isLocale(v)) return v
  } catch {
    // cookies() unavailable in some rendering contexts — fall through
  }
  return 'en'
}

export const dir = (l: Locale): 'rtl' | 'ltr' => (l === 'ar' ? 'rtl' : 'ltr')

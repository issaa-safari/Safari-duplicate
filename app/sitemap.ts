import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { site } from '@/lib/site'
import { localePath } from '@/lib/locale'
import { tourSegment } from '@/lib/slug'
import { hasArabicContent } from '@/lib/seo'

// Regenerate at most hourly; tour/departure churn is low.
export const revalidate = 3600

type Entry = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
  lastModified?: Date
  /** False for a record with no real Arabic — see hasArabicContent. */
  translated?: boolean
}

const abs = (path: string) => `${site.url}${path === '/' ? '' : path}`

/**
 * One row per language, each declaring the full alternate set. Listing only
 * English would leave every Arabic URL undiscovered; the alternates are what
 * tell Google the two are translations rather than competing pages.
 */
function localisedEntries(entries: Entry[]): MetadataRoute.Sitemap {
  return entries.flatMap((entry) => {
    // An untranslated record renders at /ar/... in English. Listing that as the
    // Arabic edition would submit a duplicate of the English page and back a
    // false hreflang claim, so it is left out until the Arabic exists.
    const translated = entry.translated ?? true
    const languages: Record<string, string> = { en: abs(localePath(entry.path, 'en')) }
    if (translated) languages.ar = abs(localePath(entry.path, 'ar'))

    const locales = translated ? (['en', 'ar'] as const) : (['en'] as const)
    return locales.map((locale) => ({
      url: abs(localePath(entry.path, locale)),
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      alternates: { languages },
    }))
  })
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: Entry[] = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/tours', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/departures', changeFrequency: 'daily', priority: 0.9 },
    { path: '/gallery', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/quote-request', changeFrequency: 'monthly', priority: 0.7 },
  ]

  try {
    const admin = createAdminClient()
    const [{ data: tours }, { data: departures }] = await Promise.all([
      admin.from('tours').select('id, slug, title_ar, overview_ar, updated_at').eq('status', 'active'),
      admin
        .from('departures')
        .select('id, start_date, tours(title_ar, overview_ar)')
        .eq('is_active', true)
        .gte('start_date', new Date().toISOString().split('T')[0]),
    ])

    const tourEntries: Entry[] = (tours ?? []).map((t) => ({
      path: `/tours/${tourSegment(t)}`,
      lastModified: t.updated_at ? new Date(t.updated_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.8,
      translated: hasArabicContent(t),
    }))

    const departureEntries: Entry[] = (departures ?? []).map((d) => ({
      path: `/departures/${d.id}`,
      changeFrequency: 'daily',
      priority: 0.7,
      // A departure is only as translated as the tour behind it.
      translated: hasArabicContent((d as { tours?: { title_ar?: string | null; overview_ar?: string | null } }).tours ?? {}),
    }))

    return localisedEntries([...staticEntries, ...tourEntries, ...departureEntries])
  } catch (err) {
    // Never fail the sitemap outright — serve the static routes at minimum.
    console.error('[sitemap] failed to load dynamic routes', err)
    return localisedEntries(staticEntries)
  }
}

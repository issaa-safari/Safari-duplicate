import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { site } from '@/lib/site'
import { localePath } from '@/lib/locale'

// Regenerate at most hourly; tour/departure churn is low.
export const revalidate = 3600

type Entry = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
  lastModified?: Date
}

const abs = (path: string) => `${site.url}${path === '/' ? '' : path}`

/**
 * One row per language, each declaring the full alternate set. Listing only
 * English would leave every Arabic URL undiscovered; the alternates are what
 * tell Google the two are translations rather than competing pages.
 */
function localisedEntries(entries: Entry[]): MetadataRoute.Sitemap {
  return entries.flatMap((entry) => {
    const languages = {
      en: abs(localePath(entry.path, 'en')),
      ar: abs(localePath(entry.path, 'ar')),
    }
    return (['en', 'ar'] as const).map((locale) => ({
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
      admin.from('tours').select('id, updated_at').eq('status', 'active'),
      admin
        .from('departures')
        .select('id, start_date')
        .eq('is_active', true)
        .gte('start_date', new Date().toISOString().split('T')[0]),
    ])

    const tourEntries: Entry[] = (tours ?? []).map((t) => ({
      path: `/tours/${t.id}`,
      lastModified: t.updated_at ? new Date(t.updated_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

    const departureEntries: Entry[] = (departures ?? []).map((d) => ({
      path: `/departures/${d.id}`,
      changeFrequency: 'daily',
      priority: 0.7,
    }))

    return localisedEntries([...staticEntries, ...tourEntries, ...departureEntries])
  } catch (err) {
    // Never fail the sitemap outright — serve the static routes at minimum.
    console.error('[sitemap] failed to load dynamic routes', err)
    return localisedEntries(staticEntries)
  }
}

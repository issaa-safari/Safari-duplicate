import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { site } from '@/lib/site'

// Regenerate at most hourly; tour/departure churn is low.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: site.url, changeFrequency: 'weekly', priority: 1 },
    { url: `${site.url}/tours`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${site.url}/departures`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${site.url}/gallery`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${site.url}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${site.url}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${site.url}/quote-request`, changeFrequency: 'monthly', priority: 0.7 },
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

    const tourRoutes: MetadataRoute.Sitemap = (tours ?? []).map((t) => ({
      url: `${site.url}/tours/${t.id}`,
      lastModified: t.updated_at ? new Date(t.updated_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

    const departureRoutes: MetadataRoute.Sitemap = (departures ?? []).map((d) => ({
      url: `${site.url}/departures/${d.id}`,
      changeFrequency: 'daily',
      priority: 0.7,
    }))

    return [...staticRoutes, ...tourRoutes, ...departureRoutes]
  } catch (err) {
    // Never fail the sitemap outright — serve the static routes at minimum.
    console.error('[sitemap] failed to load dynamic routes', err)
    return staticRoutes
  }
}

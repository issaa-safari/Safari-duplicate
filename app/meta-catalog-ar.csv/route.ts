import { createAdminClient } from '@/lib/supabase/admin'
import { buildMetaArabicLanguageFeed, type MetaCatalogDeparture, type MetaCatalogTour } from '@/lib/meta-catalog'

export const dynamic = 'force-dynamic'

const headers = {
  'Content-Type': 'text/csv; charset=utf-8',
  'Content-Disposition': 'inline; filename="safari-adventure-riders-meta-catalog-ar.csv"',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  'X-Content-Type-Options': 'nosniff',
}

export async function GET() {
  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const [tourResult, departureResult] = await Promise.all([
    admin
      .from('tours')
      .select('id, slug, title_en, title_ar, overview_en, overview_ar, type, duration_days, hero_image_url, gallery_urls, base_price_usd, countries_visited')
      .eq('status', 'active')
      .eq('show_on_website', true)
      .order('title_en'),
    admin
      .from('departures')
      .select('tour_id, price_usd, price_single_usd')
      .eq('is_active', true)
      .eq('is_public', true)
      .gte('end_date', today),
  ])

  if (tourResult.error || departureResult.error) {
    console.error('Meta Arabic catalog feed query failed', {
      tours: tourResult.error?.message,
      departures: departureResult.error?.message,
    })
    return new Response('Catalog feed is temporarily unavailable.\n', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }

  return new Response(buildMetaArabicLanguageFeed(
    (tourResult.data ?? []) as MetaCatalogTour[],
    (departureResult.data ?? []) as MetaCatalogDeparture[],
  ), { headers })
}

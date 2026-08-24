import { localePath } from '@/lib/locale'
import { tourSegment } from '@/lib/slug'
import { site } from '@/lib/site'

export type MetaCatalogTour = {
  id: string
  slug: string | null
  title_en: string
  title_ar: string | null
  overview_en: string | null
  overview_ar: string | null
  type: string | null
  duration_days: number | null
  hero_image_url: string | null
  gallery_urls: unknown
  base_price_usd: number | string | null
  countries_visited: unknown
}

export type MetaCatalogDeparture = {
  tour_id: string
  price_usd: number | string | null
  price_single_usd: number | string | null
}

const PRIMARY_HEADERS = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'link',
  'image_link',
  'brand',
  'product_type',
  'custom_label_0',
  'custom_label_1',
  'custom_label_2',
] as const

const ARABIC_HEADERS = ['id', 'title', 'description'] as const

function csvCell(value: unknown): string {
  const text = String(value ?? '').replace(/\r\n?/g, '\n')
  return `"${text.replace(/"/g, '""')}"`
}

function csvLine(values: readonly unknown[]): string {
  return values.map(csvCell).join(',')
}

function positivePrice(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

function firstImage(tour: MetaCatalogTour): string | null {
  if (tour.hero_image_url?.trim()) return tour.hero_image_url.trim()
  if (!Array.isArray(tour.gallery_urls)) return null
  const image = tour.gallery_urls.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
  return image?.trim() ?? null
}

function compactDescription(tour: MetaCatalogTour, locale: 'en' | 'ar'): string {
  const source = locale === 'ar'
    ? (tour.overview_ar || tour.overview_en)
    : tour.overview_en
  const fallback = locale === 'ar'
    ? 'رحلة سفاري منظمة في شرق أفريقيا مع سفاري أدفنتشر رايدرز.'
    : 'A professionally organised East Africa tour with Safari Adventure Riders.'
  return (source || fallback).replace(/\s+/g, ' ').trim().slice(0, 5_000)
}

function countriesLabel(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value.filter((country): country is string => typeof country === 'string' && country.trim().length > 0).join(' / ')
}

function tourUrl(tour: MetaCatalogTour, locale: 'en' | 'ar'): string {
  const path = `/tours/${tourSegment(tour)}`
  return `${site.url}${locale === 'ar' ? localePath(path, 'ar') : path}`
}

function priceByTour(departures: MetaCatalogDeparture[]): Map<string, number> {
  const prices = new Map<string, number>()
  for (const departure of departures) {
    const candidates = [positivePrice(departure.price_usd), positivePrice(departure.price_single_usd)]
      .filter((value): value is number => value !== null)
    if (!candidates.length) continue
    const price = Math.min(...candidates)
    const current = prices.get(departure.tour_id)
    if (current === undefined || price < current) prices.set(departure.tour_id, price)
  }
  return prices
}

export function buildMetaPrimaryFeed(tours: MetaCatalogTour[], departures: MetaCatalogDeparture[]): string {
  const departurePrices = priceByTour(departures)
  const rows = tours.flatMap((tour) => {
    const image = firstImage(tour)
    const price = departurePrices.get(tour.id) ?? positivePrice(tour.base_price_usd)
    // Meta rejects incomplete items. Keep the feed healthy by omitting tours
    // until both a usable image and a real sellable price are configured.
    if (!image || price === null) return []

    const type = tour.type?.trim() || 'safari'
    return [[
      tour.id,
      tour.title_en,
      compactDescription(tour, 'en'),
      'in stock',
      'new',
      `${price.toFixed(2)} USD`,
      tourUrl(tour, 'en'),
      image,
      site.name,
      `Travel > Tours > ${type}`,
      type,
      tour.duration_days ? `${tour.duration_days} days` : '',
      countriesLabel(tour.countries_visited),
    ]]
  })

  return `\uFEFF${[csvLine(PRIMARY_HEADERS), ...rows.map(csvLine)].join('\n')}\n`
}

export function buildMetaArabicLanguageFeed(tours: MetaCatalogTour[], departures: MetaCatalogDeparture[]): string {
  const departurePrices = priceByTour(departures)
  const rows = tours.flatMap((tour) => {
    if (!firstImage(tour) || (departurePrices.get(tour.id) ?? positivePrice(tour.base_price_usd)) === null) return []
    return [[
      tour.id,
      tour.title_ar || tour.title_en,
      compactDescription(tour, 'ar'),
    ]]
  })

  return `\uFEFF${[csvLine(ARABIC_HEADERS), ...rows.map(csvLine)].join('\n')}\n`
}

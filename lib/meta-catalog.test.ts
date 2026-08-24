import { describe, expect, it } from 'vitest'
import { buildMetaArabicLanguageFeed, buildMetaPrimaryFeed, type MetaCatalogTour } from './meta-catalog'

const tour: MetaCatalogTour = {
  id: 'tour-1',
  slug: 'kenya-safari',
  title_en: 'Kenya Safari, 8 Days',
  title_ar: 'سفاري كينيا 8 أيام',
  overview_en: 'Wildlife, lakes and forests.\nBuilt for GCC travellers.',
  overview_ar: 'حياة برية وبحيرات وغابات.',
  type: 'private',
  duration_days: 8,
  hero_image_url: 'https://images.example.com/safari.jpg',
  gallery_urls: [],
  base_price_usd: 1_500,
  countries_visited: ['Kenya'],
}

describe('Meta catalog feeds', () => {
  it('exports a valid primary feed and prefers the lowest upcoming departure price', () => {
    const csv = buildMetaPrimaryFeed([tour], [
      { tour_id: tour.id, price_usd: 1_350, price_single_usd: 1_800 },
    ])

    expect(csv).toContain('"id","title","description","availability"')
    expect(csv).toContain('"Kenya Safari, 8 Days"')
    expect(csv).toContain('"1350.00 USD"')
    expect(csv).toContain('"https://www.safariadventureriders.com/tours/kenya-safari"')
    expect(csv).toContain('"Wildlife, lakes and forests. Built for GCC travellers."')
  })

  it('uses the base price when no public departure price is available', () => {
    const csv = buildMetaPrimaryFeed([tour], [])
    expect(csv).toContain('"1500.00 USD"')
  })

  it('omits incomplete tours instead of publishing invalid catalog items', () => {
    const csv = buildMetaPrimaryFeed([{ ...tour, hero_image_url: null, gallery_urls: [] }], [])
    expect(csv.trim().split('\n')).toHaveLength(1)
  })

  it('exports matching Arabic localization IDs and Arabic copy', () => {
    const csv = buildMetaArabicLanguageFeed([tour], [])
    expect(csv).toContain('"tour-1","سفاري كينيا 8 أيام","حياة برية وبحيرات وغابات."')
  })
})

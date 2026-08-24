import { describe, expect, it } from 'vitest'
import { departurePublishingBlockers, type DeparturePublishingRecord } from './departure-publishing'

function ready(overrides: Partial<DeparturePublishingRecord> = {}): DeparturePublishingRecord {
  return {
    kind: 'scheduled_group',
    is_active: true,
    start_date: '2027-01-10',
    end_date: '2027-01-18',
    max_seats: 10,
    price_usd: 4500,
    price_single_usd: 5100,
    status: 'available',
    tours: {
      title_en: 'Kenya Highlands Adventure',
      slug: 'kenya-highlands-adventure',
      status: 'active',
      is_active: true,
      show_on_website: true,
      hero_image_url: 'https://example.com/hero.jpg',
      overview_en: 'A complete supported adventure.',
      tour_days: [{ id: 'day-1' }],
    },
    ...overrides,
  }
}

describe('departure publishing readiness', () => {
  it('allows a complete scheduled departure', () => {
    expect(departurePublishingBlockers(ready())).toEqual([])
  })

  it('blocks a departure whose linked itinerary would return 404', () => {
    const record = ready({
      tours: { ...(ready().tours as Exclude<DeparturePublishingRecord['tours'], null | unknown[]>), show_on_website: false },
    })
    expect(departurePublishingBlockers(record)).toContain('Linked itinerary is hidden from the website')
  })

  it('blocks incomplete content and private custom operations', () => {
    const record = ready({
      kind: 'private_custom',
      tours: { ...(ready().tours as Exclude<DeparturePublishingRecord['tours'], null | unknown[]>), hero_image_url: null, tour_days: [] },
    })
    const blockers = departurePublishingBlockers(record)
    expect(blockers).toContain('Private custom trips cannot be public')
    expect(blockers).toContain('Linked itinerary has no hero image')
    expect(blockers).toContain('Linked itinerary has no day-by-day programme')
  })
})


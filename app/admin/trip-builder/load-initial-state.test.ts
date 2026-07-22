import { describe, it, expect } from 'vitest'
import { hotelRowsFromItinerary } from './load-initial-state'

type Day = {
  id: string
  day_number: number
  day_number_end: number | null
  day_date: string | null
  destination_id: string | null
  meals: string[] | null
}

const day = (over: Partial<Day> & { id: string; day_number: number }): Day => ({
  day_number_end: null,
  day_date: null,
  destination_id: null,
  meals: null,
  ...over,
})

const accom = (entries: Array<[string, string]>) =>
  new Map(entries.map(([dayId, entityId]) => [dayId, { entityId, destinationId: null }]))

describe('hotelRowsFromItinerary', () => {
  it('gives a multi-night stop its full span, not one night', () => {
    // "Day 1–2" is a single quote_days row spanning day_number 1→2.
    const days = [day({ id: 'd1', day_number: 1, day_number_end: 2, day_date: '2026-07-29' })]
    const rows = hotelRowsFromItinerary(days, accom([['d1', 'hotelA']]), '2026-07-29')
    expect(rows).toHaveLength(1)
    expect(rows[0].checkIn).toBe('2026-07-29')
    expect(rows[0].checkOut).toBe('2026-07-31') // 2 nights → check out the 31st
  })

  it('keeps a plain single-night stop at one night', () => {
    const days = [day({ id: 'd3', day_number: 3, day_date: '2026-07-31' })]
    const rows = hotelRowsFromItinerary(days, accom([['d3', 'hotelB']]), '2026-07-29')
    expect(rows[0].checkIn).toBe('2026-07-31')
    expect(rows[0].checkOut).toBe('2026-08-01') // 1 night
  })

  it('seeds the whole itinerary with correct nights per stop', () => {
    // Mirrors the reported quote: two 2-night stops, one 1-night stop.
    const days = [
      day({ id: 'd1', day_number: 1, day_number_end: 2, day_date: '2026-07-29' }), // 2 nights
      day({ id: 'd3', day_number: 3, day_date: '2026-07-31' }),                     // 1 night
      day({ id: 'd4', day_number: 4, day_number_end: 5, day_date: '2026-08-01' }), // 2 nights
    ]
    const rows = hotelRowsFromItinerary(
      days,
      accom([['d1', 'hotelA'], ['d3', 'hotelB'], ['d4', 'hotelC']]),
      '2026-07-29',
    )
    expect(rows.map(r => [r.checkIn, r.checkOut])).toEqual([
      ['2026-07-29', '2026-07-31'],
      ['2026-07-31', '2026-08-01'],
      ['2026-08-01', '2026-08-03'],
    ])
  })

  it('collapses consecutive same-property days into one stay', () => {
    // Two separate single-day rows at the same hotel merge into one 2-night stay.
    const days = [
      day({ id: 'd1', day_number: 1, day_date: '2026-07-29' }),
      day({ id: 'd2', day_number: 2, day_date: '2026-07-30' }),
    ]
    const rows = hotelRowsFromItinerary(days, accom([['d1', 'hotelA'], ['d2', 'hotelA']]), '2026-07-29')
    expect(rows).toHaveLength(1)
    expect(rows[0].checkIn).toBe('2026-07-29')
    expect(rows[0].checkOut).toBe('2026-07-31')
  })

  it('skips days with no accommodation (day-only visits)', () => {
    const days = [
      day({ id: 'd1', day_number: 1, day_date: '2026-07-29' }),
      day({ id: 'd2', day_number: 2, day_date: '2026-07-30' }), // day-only, no accom
    ]
    const rows = hotelRowsFromItinerary(days, accom([['d1', 'hotelA']]), '2026-07-29')
    expect(rows).toHaveLength(1)
    expect(rows[0].checkOut).toBe('2026-07-30') // 1 night, day 2 not added
  })
})

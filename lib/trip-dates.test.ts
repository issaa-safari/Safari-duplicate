import { describe, expect, it } from 'vitest'
import { bookingTiming, resolveTripDates, tripTiming } from './trip-dates'

const TODAY = new Date('2026-08-12T09:00:00Z')

describe('resolveTripDates', () => {
  it('takes the departure’s dates when the booking is a seat on one', () => {
    const d = resolveTripDates({
      start_date: '2026-01-01',
      end_date: '2026-01-05',
      departures: { start_date: '2026-09-17', end_date: '2026-09-23' },
    })
    // The departure wins even though the booking carries its own — a seat runs
    // when its departure runs, whatever got typed on the booking.
    expect(d).toEqual({ startDate: '2026-09-17', endDate: '2026-09-23', source: 'departure' })
  })

  it('falls back to the booking’s own dates for a private trip', () => {
    const d = resolveTripDates({ start_date: '2026-10-11', end_date: '2026-10-18', departures: null })
    expect(d).toEqual({ startDate: '2026-10-11', endDate: '2026-10-18', source: 'booking' })
  })

  it('reports none when nothing anywhere has a date', () => {
    expect(resolveTripDates({ departures: null })).toEqual({
      startDate: null, endDate: null, source: 'none',
    })
  })

  it('survives a missing booking entirely', () => {
    expect(resolveTripDates(null).source).toBe('none')
    expect(resolveTripDates(undefined).source).toBe('none')
  })

  it('treats an empty string as no date, not as a date', () => {
    expect(resolveTripDates({ start_date: '', end_date: '  ', departures: null }).source).toBe('none')
  })

  it('accepts a half-filled range on either side', () => {
    expect(resolveTripDates({ start_date: '2026-10-11', departures: null })).toEqual({
      startDate: '2026-10-11', endDate: null, source: 'booking',
    })
    expect(resolveTripDates({ departures: { end_date: '2026-09-23' } })).toEqual({
      startDate: null, endDate: '2026-09-23', source: 'departure',
    })
  })

  it('does not let an empty departure mask the booking’s own dates', () => {
    const d = resolveTripDates({
      start_date: '2026-10-11',
      end_date: '2026-10-18',
      departures: { start_date: null, end_date: null },
    })
    expect(d.source).toBe('booking')
    expect(d.startDate).toBe('2026-10-11')
  })
})

describe('tripTiming', () => {
  it('is upcoming while the end date is still ahead', () => {
    expect(tripTiming({ startDate: '2026-09-17', endDate: '2026-09-23', source: 'departure' }, TODAY))
      .toBe('upcoming')
  })

  it('is past once the end date has gone by', () => {
    expect(tripTiming({ startDate: '2026-07-01', endDate: '2026-07-08', source: 'departure' }, TODAY))
      .toBe('past')
  })

  it('counts a trip ending today as still running', () => {
    expect(tripTiming({ startDate: '2026-08-10', endDate: '2026-08-12', source: 'booking' }, TODAY))
      .toBe('upcoming')
  })

  it('judges an open-ended trip on its start date', () => {
    expect(tripTiming({ startDate: '2026-12-01', endDate: null, source: 'booking' }, TODAY)).toBe('upcoming')
    expect(tripTiming({ startDate: '2026-01-01', endDate: null, source: 'booking' }, TODAY)).toBe('past')
  })

  it('calls an undated trip undated rather than guessing', () => {
    // This is the bug the module exists for: the dashboard tested
    // `new Date(undefined) > new Date()`, which is false, and it was equally
    // false for the completed list — so the booking showed up in neither.
    expect(tripTiming({ startDate: null, endDate: null, source: 'none' }, TODAY)).toBe('undated')
  })

  it('treats an unparseable date as undated instead of throwing', () => {
    expect(tripTiming({ startDate: 'soon', endDate: 'later', source: 'booking' }, TODAY)).toBe('undated')
  })
})

describe('bookingTiming', () => {
  it('resolves and classifies in one step', () => {
    expect(bookingTiming({ departures: { start_date: '2026-09-17', end_date: '2026-09-23' } }, TODAY))
      .toBe('upcoming')
    expect(bookingTiming({ start_date: '2026-02-01', end_date: '2026-02-09', departures: null }, TODAY))
      .toBe('past')
    expect(bookingTiming({ departures: null }, TODAY)).toBe('undated')
  })
})

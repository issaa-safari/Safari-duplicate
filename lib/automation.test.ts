import { describe, it, expect } from 'vitest'
import {
  daysBetween,
  shouldComplete,
  shouldArchive,
  shouldDelete,
  shouldExpireQuote,
  type AutomationSettings,
} from './automation'

const settings: AutomationSettings = {
  auto_complete_on_end_date: true,
  auto_expire_quotes: true,
  auto_archive_enabled: true,
  auto_archive_days: 30,
  auto_archive_stages: ['not_booked', 'completed'],
  auto_delete_enabled: true,
  auto_delete_days: 90,
}

describe('daysBetween', () => {
  it('counts whole elapsed days', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30)
  })
  it('never goes negative', () => {
    expect(daysBetween('2026-02-01', '2026-01-01')).toBe(0)
  })
})

describe('shouldComplete', () => {
  it('completes once the end date is before today', () => {
    expect(shouldComplete('2026-07-04', '2026-07-05')).toBe(true)
  })
  it('does not complete on the end date itself', () => {
    expect(shouldComplete('2026-07-05', '2026-07-05')).toBe(false)
  })
  it('does not complete a future trip', () => {
    expect(shouldComplete('2026-08-01', '2026-07-05')).toBe(false)
  })
  it('ignores a missing date', () => {
    expect(shouldComplete(null, '2026-07-05')).toBe(false)
  })
})

describe('shouldArchive', () => {
  const now = '2026-07-05'
  it('archives a stale sweepable stage at the threshold', () => {
    expect(shouldArchive('not_booked', '2026-06-05', settings, now)).toBe(true)
  })
  it('leaves a stage not in the sweep list', () => {
    expect(shouldArchive('booked', '2026-01-01', settings, now)).toBe(false)
  })
  it('leaves a request that is not yet stale', () => {
    expect(shouldArchive('not_booked', '2026-07-01', settings, now)).toBe(false)
  })
  it('never re-archives an archived request', () => {
    expect(shouldArchive('archived', '2026-01-01', settings, now)).toBe(false)
  })
  it('respects the disabled toggle', () => {
    expect(shouldArchive('not_booked', '2026-01-01', { ...settings, auto_archive_enabled: false }, now)).toBe(false)
  })
})

describe('shouldDelete', () => {
  const now = '2026-07-05'
  it('purges once past the archive-age threshold', () => {
    expect(shouldDelete('2026-04-01', settings, now)).toBe(true)
  })
  it('keeps recently archived requests', () => {
    expect(shouldDelete('2026-06-20', settings, now)).toBe(false)
  })
  it('respects the disabled toggle', () => {
    expect(shouldDelete('2020-01-01', { ...settings, auto_delete_enabled: false }, now)).toBe(false)
  })
})

describe('shouldExpireQuote', () => {
  const now = '2026-07-05'

  it('expires a sent quote whose date has passed', () => {
    expect(shouldExpireQuote('sent', '2026-06-30', settings, now)).toBe(true)
  })

  it('expires a viewed quote too — the client saw it and did nothing', () => {
    expect(shouldExpireQuote('viewed', '2026-06-30', settings, now)).toBe(true)
  })

  it('leaves a quote valid on its own last day', () => {
    expect(shouldExpireQuote('sent', '2026-07-05', settings, now)).toBe(false)
  })

  it('leaves drafts and ready quotes alone — unsent is not expired', () => {
    // Otherwise work in progress would land in the Closed bucket the moment a
    // date typed weeks ago went by.
    expect(shouldExpireQuote('draft', '2020-01-01', settings, now)).toBe(false)
    expect(shouldExpireQuote('ready', '2020-01-01', settings, now)).toBe(false)
  })

  it('never overturns a decided quote', () => {
    expect(shouldExpireQuote('accepted', '2020-01-01', settings, now)).toBe(false)
    expect(shouldExpireQuote('declined', '2020-01-01', settings, now)).toBe(false)
    expect(shouldExpireQuote('superseded', '2020-01-01', settings, now)).toBe(false)
  })

  it('does nothing without a date', () => {
    expect(shouldExpireQuote('sent', null, settings, now)).toBe(false)
    expect(shouldExpireQuote('sent', undefined, settings, now)).toBe(false)
  })

  it('ignores an unparseable date rather than expiring on it', () => {
    expect(shouldExpireQuote('sent', 'whenever', settings, now)).toBe(false)
  })

  it('respects the disabled toggle', () => {
    expect(shouldExpireQuote('sent', '2020-01-01', { auto_expire_quotes: false }, now)).toBe(false)
  })
})

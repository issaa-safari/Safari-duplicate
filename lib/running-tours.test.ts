import { describe, it, expect } from 'vitest'
import { isTripRunning, dayOfTrip } from './running-tours'

describe('isTripRunning', () => {
  it('is true within the window', () => {
    expect(isTripRunning('2026-07-01', '2026-07-10', '2026-07-05')).toBe(true)
  })
  it('is inclusive of the start and end dates', () => {
    expect(isTripRunning('2026-07-01', '2026-07-10', '2026-07-01')).toBe(true)
    expect(isTripRunning('2026-07-01', '2026-07-10', '2026-07-10')).toBe(true)
  })
  it('is false before and after', () => {
    expect(isTripRunning('2026-07-01', '2026-07-10', '2026-06-30')).toBe(false)
    expect(isTripRunning('2026-07-01', '2026-07-10', '2026-07-11')).toBe(false)
  })
  it('is false with missing dates', () => {
    expect(isTripRunning(null, '2026-07-10', '2026-07-05')).toBe(false)
    expect(isTripRunning('2026-07-01', null, '2026-07-05')).toBe(false)
  })
})

describe('dayOfTrip', () => {
  it('is day 1 on the start date', () => {
    expect(dayOfTrip('2026-07-01', '2026-07-10', '2026-07-01')).toBe(1)
  })
  it('counts inclusive days', () => {
    expect(dayOfTrip('2026-07-01', '2026-07-10', '2026-07-05')).toBe(5)
  })
  it('is null when not running', () => {
    expect(dayOfTrip('2026-07-01', '2026-07-10', '2026-07-20')).toBeNull()
  })
})

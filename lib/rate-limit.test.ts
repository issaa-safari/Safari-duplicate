import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rateLimit } from './rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests up to the limit within a window', () => {
    const key = `t1-${Math.random()}`
    expect(rateLimit(key, 3, 60_000)).toBe(true)
    expect(rateLimit(key, 3, 60_000)).toBe(true)
    expect(rateLimit(key, 3, 60_000)).toBe(true)
  })

  it('rejects the request that exceeds the limit', () => {
    const key = `t2-${Math.random()}`
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000)
    expect(rateLimit(key, 3, 60_000)).toBe(false)
  })

  it('resets after the window elapses', () => {
    const key = `t3-${Math.random()}`
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000)
    expect(rateLimit(key, 3, 60_000)).toBe(false)

    vi.advanceTimersByTime(61_000)
    expect(rateLimit(key, 3, 60_000)).toBe(true)
  })

  it('tracks separate keys independently', () => {
    const a = `t4a-${Math.random()}`
    const b = `t4b-${Math.random()}`
    for (let i = 0; i < 3; i++) rateLimit(a, 3, 60_000)
    expect(rateLimit(a, 3, 60_000)).toBe(false)
    expect(rateLimit(b, 3, 60_000)).toBe(true)
  })
})

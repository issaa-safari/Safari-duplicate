import { describe, expect, it } from 'vitest'
import { isUnlocalised, localePath, splitLocalePath } from './locale'

describe('localePath', () => {
  it('leaves English paths unprefixed so existing URLs keep their equity', () => {
    expect(localePath('/tours', 'en')).toBe('/tours')
    expect(localePath('/', 'en')).toBe('/')
  })

  it('prefixes Arabic paths', () => {
    expect(localePath('/tours', 'ar')).toBe('/ar/tours')
    expect(localePath('/tours/abc-123', 'ar')).toBe('/ar/tours/abc-123')
  })

  it('maps the Arabic home page to /ar, not /ar/', () => {
    expect(localePath('/', 'ar')).toBe('/ar')
  })

  it('never prefixes single-language areas', () => {
    // A prefix here would serve English content inside a lang="ar" document,
    // and for /dashboard it would also route around the session gate.
    expect(localePath('/privacy', 'ar')).toBe('/privacy')
    expect(localePath('/terms', 'ar')).toBe('/terms')
    expect(localePath('/dashboard', 'ar')).toBe('/dashboard')
    expect(localePath('/dashboard/settings', 'ar')).toBe('/dashboard/settings')
    expect(localePath('/admin/quotes', 'ar')).toBe('/admin/quotes')
    expect(localePath('/quote/some-token', 'ar')).toBe('/quote/some-token')
  })

  it('tolerates paths given without a leading slash', () => {
    expect(localePath('tours', 'ar')).toBe('/ar/tours')
  })
})

describe('splitLocalePath', () => {
  it('reads the locale off the prefix', () => {
    expect(splitLocalePath('/ar/tours')).toEqual({ locale: 'ar', path: '/tours' })
    expect(splitLocalePath('/ar')).toEqual({ locale: 'ar', path: '/' })
  })

  it('treats unprefixed paths as English', () => {
    expect(splitLocalePath('/tours')).toEqual({ locale: 'en', path: '/tours' })
    expect(splitLocalePath('/')).toEqual({ locale: 'en', path: '/' })
  })

  it('does not mistake a path that merely starts with "ar" for the prefix', () => {
    expect(splitLocalePath('/arrivals')).toEqual({ locale: 'en', path: '/arrivals' })
  })

  it('round-trips with localePath', () => {
    for (const path of ['/', '/tours', '/departures/xyz']) {
      expect(splitLocalePath(localePath(path, 'ar'))).toEqual({ locale: 'ar', path })
      expect(splitLocalePath(localePath(path, 'en'))).toEqual({ locale: 'en', path })
    }
  })
})

describe('isUnlocalised', () => {
  it('matches a prefix only on a segment boundary', () => {
    expect(isUnlocalised('/book')).toBe(true)
    expect(isUnlocalised('/book/anything')).toBe(true)
    // /bookings is a different route and must stay translatable.
    expect(isUnlocalised('/bookings')).toBe(false)
  })

  it('leaves the marketing pages localisable', () => {
    expect(isUnlocalised('/tours')).toBe(false)
    expect(isUnlocalised('/')).toBe(false)
  })
})

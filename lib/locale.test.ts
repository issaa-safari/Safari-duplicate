import { describe, expect, it } from 'vitest'
import { isUnlocalised, localePath, preferredLocale, splitLocalePath } from './locale'

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
    // A prefix here would serve English content inside a lang="ar" document.
    expect(localePath('/privacy', 'ar')).toBe('/privacy')
    expect(localePath('/terms', 'ar')).toBe('/terms')
    expect(localePath('/admin/quotes', 'ar')).toBe('/admin/quotes')
    expect(localePath('/quote/some-token', 'ar')).toBe('/quote/some-token')
  })

  it('does prefix the dashboard, which is fully translated', () => {
    expect(localePath('/dashboard', 'ar')).toBe('/ar/dashboard')
    expect(localePath('/dashboard/settings', 'ar')).toBe('/ar/dashboard/settings')
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

  it('leaves the client dashboard localisable', () => {
    // It has a full Arabic dictionary; excluding it was what pinned it to
    // English once the language moved into the URL.
    expect(isUnlocalised('/dashboard')).toBe(false)
  })
})

describe('preferredLocale', () => {
  it('follows the browser when it asks for Arabic', () => {
    expect(preferredLocale('ar-SA,ar;q=0.9,en;q=0.8')).toBe('ar')
    expect(preferredLocale('ar')).toBe('ar')
  })

  it('keeps an English-preferring visitor on English wherever they are', () => {
    // Ranking matters more than presence: en outranks ar here.
    expect(preferredLocale('en-US,en;q=0.9,ar;q=0.5', 'SA')).toBe('en')
  })

  it('honours quality values over the order sent', () => {
    expect(preferredLocale('en;q=0.4,ar;q=0.9')).toBe('ar')
  })

  it('ignores a tag the visitor explicitly refuses', () => {
    expect(preferredLocale('ar;q=0,en;q=0.5')).toBe('en')
  })

  it('falls back to location only when the header decides nothing', () => {
    expect(preferredLocale(null, 'AE')).toBe('ar')
    expect(preferredLocale('fr-FR,fr;q=0.9', 'EG')).toBe('ar')
    expect(preferredLocale('fr-FR', 'FR')).toBe('en')
    expect(preferredLocale(null, null)).toBe('en')
  })

  it('defaults to English for anything unrecognisable', () => {
    // A crawler that sends no Accept-Language must not be redirected.
    expect(preferredLocale('')).toBe('en')
    expect(preferredLocale('*')).toBe('en')
  })
})

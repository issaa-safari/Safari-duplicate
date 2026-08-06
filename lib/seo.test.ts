import { describe, expect, it } from 'vitest'
import { hasArabicContent, languageAlternates, noindexIfUntranslated } from './seo'

describe('hasArabicContent', () => {
  it('requires both title and overview', () => {
    expect(hasArabicContent({ title_ar: 'مستكشف', overview_ar: 'رحلة' })).toBe(true)
    expect(hasArabicContent({ title_ar: 'مستكشف', overview_ar: null })).toBe(false)
    expect(hasArabicContent({ title_ar: null, overview_ar: 'رحلة' })).toBe(false)
    expect(hasArabicContent({})).toBe(false)
  })

  it('treats whitespace as empty', () => {
    // A field containing only spaces renders as nothing, so it must not count
    // as a translation.
    expect(hasArabicContent({ title_ar: '   ', overview_ar: 'رحلة' })).toBe(false)
  })

  it('does not require the day-by-day itinerary', () => {
    // Deliberate: the page is coherent with title + overview alone.
    expect(hasArabicContent({ title_ar: 'مستكشف', overview_ar: 'رحلة' })).toBe(true)
  })
})

describe('languageAlternates', () => {
  it('advertises both languages for a translated page', () => {
    expect(languageAlternates('/tours/x')).toEqual({
      en: '/tours/x',
      ar: '/ar/tours/x',
      'x-default': '/tours/x',
    })
  })

  it('drops the ar entry when there is no Arabic', () => {
    // Claiming an Arabic translation that is really the English text would be a
    // false hreflang pair.
    expect(languageAlternates('/tours/x', false)).toEqual({
      en: '/tours/x',
      'x-default': '/tours/x',
    })
  })
})

describe('noindexIfUntranslated', () => {
  it('noindexes only the Arabic URL of an untranslated record', () => {
    expect(noindexIfUntranslated('ar', false)).toEqual({ robots: { index: false, follow: true } })
  })

  it('leaves everything else indexable', () => {
    expect(noindexIfUntranslated('ar', true)).toEqual({})
    expect(noindexIfUntranslated('en', false)).toEqual({})
    expect(noindexIfUntranslated('en', true)).toEqual({})
  })

  it('keeps following links so the page still passes equity', () => {
    const { robots } = noindexIfUntranslated('ar', false) as { robots: { follow: boolean } }
    expect(robots.follow).toBe(true)
  })
})

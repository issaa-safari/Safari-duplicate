import { describe, expect, it } from 'vitest'
import { breadcrumbJsonLd, hasArabicContent, languageAlternates, noindexIfUntranslated, travelAgencyJsonLd } from './seo'
import { site } from './site'

describe('hasArabicContent', () => {
  it('requires both title and overview', () => {
    expect(hasArabicContent({ title_ar: 'مستكشف', overview_ar: 'رحلة' })).toBe(true)
    expect(hasArabicContent({ title_ar: 'مستكشف', overview_ar: null })).toBe(false)
    expect(hasArabicContent({ title_ar: null, overview_ar: 'رحلة' })).toBe(false)
    expect(hasArabicContent({})).toBe(false)
  })

  it('treats whitespace as empty', () => {
    expect(hasArabicContent({ title_ar: '   ', overview_ar: 'رحلة' })).toBe(false)
  })

  it('does not require the day-by-day itinerary', () => {
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

describe('breadcrumbJsonLd', () => {
  const items = [
    { label: 'Home', href: '/' },
    { label: 'Kenya Safaris', href: '/kenya-safari' },
    { label: 'Maasai Mara', href: '/maasai-mara-safari' },
  ]

  it('builds ordered absolute English breadcrumb URLs', () => {
    const data = breadcrumbJsonLd(items, 'en') as { itemListElement: { position: number; item: string }[] }
    expect(data.itemListElement.map((item) => item.position)).toEqual([1, 2, 3])
    expect(data.itemListElement[2].item).toContain('/maasai-mara-safari')
  })

  it('localises Arabic breadcrumb URLs', () => {
    const data = breadcrumbJsonLd(items, 'ar') as { itemListElement: { item: string }[] }
    expect(data.itemListElement[1].item).toContain('/ar/kenya-safari')
    expect(data.itemListElement[2].item).toContain('/ar/maasai-mara-safari')
  })
})

describe('travelAgencyJsonLd', () => {
  it('publishes the Arabic family name as an alternate organization name', () => {
    const data = travelAgencyJsonLd()
    expect(data.name).toBe(site.name)
    expect(data.alternateName).toBe('شركة العمودي للسياحة')
  })
})

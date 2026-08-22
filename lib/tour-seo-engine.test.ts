import { describe, expect, it } from 'vitest'
import { contextualTourLinks, evaluateTourReadiness, localisedSection, rankRelatedTours } from './tour-seo-engine'

describe('tour SEO engine', () => {
  it('only localises sections containing real content in the requested locale', () => {
    const section = { section_key: 'safety', content_en: 'Supported throughout.', content_ar: '' }
    expect(localisedSection(section, 'en')).toMatchObject({ title: 'Safety', content: 'Supported throughout.' })
    expect(localisedSection(section, 'ar')).toBeNull()
  })

  it('uses deterministic template-aware readiness weights', () => {
    const result = evaluateTourReadiness({
      tour: { title_en: 'Tour', overview_en: 'Overview', hero_image_url: '/hero.jpg', status: 'active', show_on_website: true },
      seo: { seo_title_en: 'A sufficiently descriptive Kenya safari title', meta_description_en: 'x'.repeat(130), primary_keyword_en: 'kenya safari', seo_intro_en: 'Intro', hero_alt_en: 'Safari vehicle in Kenya' },
      templateId: 'template',
      requiredSections: ['safety'],
      sections: { safety: { section_key: 'safety', content_en: 'Real factual content.' } },
      itineraryCount: 3,
    })
    expect(result.scores.content).toBe(100)
    expect(result.scores.seo).toBe(100)
    expect(result.status).toBe('ready')
    expect(result.scores.arabic).toBe(0)
  })

  it('prioritises same-template related tours and never returns the current tour', () => {
    const ranked = rankRelatedTours(
      { id: 'current', template_id: 'moto', type: 'bike', duration_days: 8, destination_ids: ['nairobi'] },
      [
        { id: 'other', slug: 'other', title_en: 'Other', template_id: 'classic', type: 'private', duration_days: 8, destination_ids: ['nairobi'] },
        { id: 'same', slug: 'same', title_en: 'Same', template_id: 'moto', type: 'bike', duration_days: 10, destination_ids: [] },
        { id: 'current', slug: 'current', title_en: 'Current', template_id: 'moto' },
      ],
    )
    expect(ranked.map((tour) => tour.id)).toEqual(['same', 'other'])
  })

  it('deduplicates contextual hub links', () => {
    const links = contextualTourLinks('multi_country_safari', ['Amboseli'], 'Kenya, Tanzania')
    expect(links.map((link) => link.href)).toEqual(['/kenya-tanzania-safari', '/amboseli-safari'])
  })
})

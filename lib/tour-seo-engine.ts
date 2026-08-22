import type { Locale } from '@/lib/locale'

export type TourTemplateConfig = {
  sectionOrder?: string[]
  requiredSections?: string[]
}

export type TourContentSection = {
  section_key: string
  title_en?: string | null
  title_ar?: string | null
  content_en?: string | null
  content_ar?: string | null
  sort_order?: number
  is_enabled?: boolean
}

export const SECTION_LABELS: Record<string, { en: string; ar: string }> = {
  why_choose: { en: 'Why Choose This Tour', ar: 'لماذا تختار هذه الرحلة' },
  wildlife: { en: 'Wildlife', ar: 'الحياة البرية' },
  safari_experience: { en: 'Safari Experience', ar: 'تجربة السفاري' },
  game_drives: { en: 'Game Drives', ar: 'جولات السفاري' },
  accommodation_experience: { en: 'Accommodation Experience', ar: 'تجربة الإقامة' },
  best_time: { en: 'Best Time to Travel', ar: 'أفضل وقت للسفر' },
  who_for: { en: 'Who This Tour Is For', ar: 'لمن تناسب هذه الرحلة' },
  luxury_experience: { en: 'Luxury Experience', ar: 'التجربة الفاخرة' },
  private_transfers: { en: 'Private Transfers', ar: 'التنقلات الخاصة' },
  exclusive_experiences: { en: 'Exclusive Experiences', ar: 'التجارب الخاصة' },
  dining: { en: 'Dining', ar: 'تجربة الطعام' },
  personalization: { en: 'Personalization', ar: 'التخصيص' },
  family_suitability: { en: 'Family Suitability', ar: 'ملاءمة الرحلة للعائلات' },
  child_friendly: { en: 'Child-Friendly Experiences', ar: 'تجارب مناسبة للأطفال' },
  travel_times: { en: 'Travel Times', ar: 'أوقات التنقل' },
  family_accommodation: { en: 'Family Accommodation', ar: 'إقامة العائلات' },
  meal_flexibility: { en: 'Meal Flexibility', ar: 'مرونة الوجبات' },
  rest_time: { en: 'Rest / Free Time', ar: 'الراحة والوقت الحر' },
  safety: { en: 'Safety', ar: 'السلامة' },
  riding_experience: { en: 'Riding Experience', ar: 'تجربة القيادة' },
  route_highlights: { en: 'Route Highlights', ar: 'أبرز محطات المسار' },
  terrain: { en: 'Terrain', ar: 'طبيعة الطرق' },
  road_surfaces: { en: 'Road Surfaces', ar: 'أسطح الطرق' },
  rider_experience: { en: 'Required Riding Experience', ar: 'الخبرة المطلوبة للقيادة' },
  support: { en: 'Tour Support', ar: 'دعم الرحلة' },
  riding_gear: { en: 'Riding Gear', ar: 'معدات القيادة' },
  fuel_information: { en: 'Fuel Information', ar: 'معلومات الوقود' },
  photography: { en: 'Photography Opportunities', ar: 'فرص التصوير' },
  landscape_photography: { en: 'Landscape Photography', ar: 'تصوير الطبيعة' },
  lighting: { en: 'Light & Timing', ar: 'الإضاءة والتوقيت' },
  vehicle_setup: { en: 'Vehicle Setup', ar: 'تجهيز المركبة' },
  equipment_advice: { en: 'Equipment Advice', ar: 'نصائح المعدات' },
  photography_guide: { en: 'Photography Guide', ar: 'إرشاد التصوير' },
  kenya_highlights: { en: 'Kenya Highlights', ar: 'أبرز تجارب كينيا' },
  tanzania_highlights: { en: 'Tanzania Highlights', ar: 'أبرز تجارب تنزانيا' },
  border_logistics: { en: 'Border / Flight Logistics', ar: 'ترتيبات الحدود والطيران' },
  entry_requirements: { en: 'Entry Requirements', ar: 'متطلبات الدخول' },
  possible_destinations: { en: 'Possible Destinations', ar: 'الوجهات الممكنة' },
  vehicle_experience: { en: 'Vehicle Options', ar: 'خيارات المركبات' },
  customization: { en: 'Customization Options', ar: 'خيارات التخصيص' },
  duration_flexibility: { en: 'Duration Flexibility', ar: 'مرونة مدة الرحلة' },
  activities: { en: 'Activities', ar: 'الأنشطة' },
  group_experience: { en: 'Group Experience', ar: 'تجربة المجموعة' },
  tour_leader: { en: 'Tour Leader', ar: 'قائد الرحلة' },
  booking_conditions: { en: 'Booking Conditions', ar: 'شروط الحجز' },
}

const filled = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0

export function localisedSection(section: TourContentSection, locale: Locale) {
  const content = locale === 'ar' ? section.content_ar : section.content_en
  if (!filled(content)) return null
  const fallback = SECTION_LABELS[section.section_key]
  const title = locale === 'ar'
    ? section.title_ar || fallback?.ar || section.section_key
    : section.title_en || fallback?.en || section.section_key
  return { key: section.section_key, title, content: content!.trim() }
}

export type ReadinessInput = {
  tour: {
    title_en?: string | null
    title_ar?: string | null
    overview_en?: string | null
    overview_ar?: string | null
    hero_image_url?: string | null
    status?: string | null
    show_on_website?: boolean | null
  }
  seo: Record<string, unknown>
  templateId?: string | null
  requiredSections: string[]
  sections: Record<string, TourContentSection>
  itineraryCount: number
  duplicateTitleEn?: boolean
  duplicateTitleAr?: boolean
  duplicateMetaEn?: boolean
  duplicateMetaAr?: boolean
}

export type ReadinessResult = {
  scores: { content: number; arabic: number; seo: number }
  blockers: string[]
  warnings: string[]
  status: 'ready' | 'needs-work' | 'not-public'
}

function weightedScore(checks: { pass: boolean; weight: number }[]): number {
  const total = checks.reduce((sum, check) => sum + check.weight, 0)
  const earned = checks.reduce((sum, check) => sum + (check.pass ? check.weight : 0), 0)
  return total === 0 ? 100 : Math.round((earned / total) * 100)
}

function sectionRatio(required: string[], sections: Record<string, TourContentSection>, field: 'content_en' | 'content_ar') {
  if (required.length === 0) return true
  return required.every((key) => filled(sections[key]?.[field]))
}

export function evaluateTourReadiness(input: ReadinessInput): ReadinessResult {
  const { tour, seo, templateId, requiredSections, sections, itineraryCount } = input
  const requiredEnglish = sectionRatio(requiredSections, sections, 'content_en')
  const requiredArabic = sectionRatio(requiredSections, sections, 'content_ar')

  const scores = {
    content: weightedScore([
      { pass: filled(tour.title_en), weight: 15 },
      { pass: filled(tour.overview_en), weight: 20 },
      { pass: filled(tour.hero_image_url), weight: 15 },
      { pass: itineraryCount > 0, weight: 25 },
      { pass: filled(templateId), weight: 10 },
      { pass: requiredEnglish, weight: 15 },
    ]),
    arabic: weightedScore([
      { pass: filled(tour.title_ar), weight: 20 },
      { pass: filled(tour.overview_ar), weight: 25 },
      { pass: filled(seo.seo_title_ar), weight: 15 },
      { pass: filled(seo.meta_description_ar), weight: 15 },
      { pass: filled(seo.hero_alt_ar), weight: 10 },
      { pass: requiredArabic, weight: 15 },
    ]),
    seo: weightedScore([
      { pass: filled(seo.seo_title_en), weight: 20 },
      { pass: filled(seo.meta_description_en), weight: 25 },
      { pass: filled(seo.primary_keyword_en), weight: 10 },
      { pass: filled(seo.seo_intro_en), weight: 10 },
      { pass: filled(seo.hero_alt_en), weight: 10 },
      { pass: filled(templateId), weight: 10 },
      { pass: requiredEnglish, weight: 15 },
    ]),
  }

  const blockers: string[] = []
  if (!filled(tour.title_en)) blockers.push('English tour title is missing')
  if (!filled(tour.overview_en)) blockers.push('English tour overview is missing')
  if (!filled(tour.hero_image_url)) blockers.push('Hero image is missing')
  if (itineraryCount === 0) blockers.push('The itinerary has no days')
  if (!filled(templateId)) blockers.push('Tour template is not selected')
  if (!filled(seo.seo_title_en)) blockers.push('English SEO title is missing')
  if (!filled(seo.meta_description_en)) blockers.push('English meta description is missing')

  const warnings: string[] = []
  const titleEn = typeof seo.seo_title_en === 'string' ? seo.seo_title_en.trim() : ''
  const titleAr = typeof seo.seo_title_ar === 'string' ? seo.seo_title_ar.trim() : ''
  const metaEn = typeof seo.meta_description_en === 'string' ? seo.meta_description_en.trim() : ''
  const metaAr = typeof seo.meta_description_ar === 'string' ? seo.meta_description_ar.trim() : ''
  if (titleEn && (titleEn.length < 30 || titleEn.length > 65)) warnings.push(`English SEO title is ${titleEn.length} characters; guidance is 30–65`)
  if (titleAr && (titleAr.length < 25 || titleAr.length > 70)) warnings.push(`Arabic SEO title is ${titleAr.length} characters; guidance is 25–70`)
  if (metaEn && (metaEn.length < 120 || metaEn.length > 170)) warnings.push(`English meta description is ${metaEn.length} characters; guidance is 120–170`)
  if (metaAr && (metaAr.length < 90 || metaAr.length > 180)) warnings.push(`Arabic meta description is ${metaAr.length} characters; guidance is 90–180`)
  if (!filled(seo.primary_keyword_en)) warnings.push('English primary search topic is missing')
  if (!filled(seo.seo_intro_en)) warnings.push('English SEO intro is missing')
  if (!filled(seo.hero_alt_en)) warnings.push('Hero image English alt text is missing')
  if (!filled(tour.title_ar)) warnings.push('Arabic tour title is missing')
  if (!filled(tour.overview_ar)) warnings.push('Arabic tour overview is missing')
  if (!filled(seo.seo_title_ar)) warnings.push('Arabic SEO title is missing')
  if (!filled(seo.meta_description_ar)) warnings.push('Arabic meta description is missing')
  if (!filled(seo.hero_alt_ar)) warnings.push('Hero image Arabic alt text is missing')
  for (const key of requiredSections) {
    const label = SECTION_LABELS[key]?.en ?? key
    if (!filled(sections[key]?.content_en)) warnings.push(`${label} English content is missing`)
    if (!filled(sections[key]?.content_ar)) warnings.push(`${label} Arabic content is missing`)
  }
  if (input.duplicateTitleEn) warnings.push('English SEO title duplicates another tour')
  if (input.duplicateTitleAr) warnings.push('Arabic SEO title duplicates another tour')
  if (input.duplicateMetaEn) warnings.push('English meta description duplicates another tour')
  if (input.duplicateMetaAr) warnings.push('Arabic meta description duplicates another tour')

  const status = tour.status !== 'active' || tour.show_on_website !== true
    ? 'not-public'
    : blockers.length === 0
      ? 'ready'
      : 'needs-work'
  return { scores, blockers, warnings, status }
}

export type ContextLink = { href: string; en: string; ar: string }

const TEMPLATE_HUBS: Record<string, ContextLink> = {
  classic_safari: { href: '/kenya-safari', en: 'Explore Kenya safaris', ar: 'استكشف رحلات سفاري كينيا' },
  luxury_safari: { href: '/luxury-kenya-safari', en: 'Explore luxury Kenya safaris', ar: 'استكشف رحلات السفاري الفاخرة في كينيا' },
  family_safari: { href: '/family-safari-kenya', en: 'Explore family safaris in Kenya', ar: 'استكشف رحلات السفاري العائلية في كينيا' },
  motorcycle_adventure: { href: '/kenya-motorcycle-safari', en: 'Explore Kenya motorcycle safaris', ar: 'استكشف رحلات الدراجات النارية في كينيا' },
  photography_safari: { href: '/kenya-safari', en: 'Explore Kenya wildlife safaris', ar: 'استكشف رحلات الحياة البرية في كينيا' },
  multi_country_safari: { href: '/kenya-tanzania-safari', en: 'Explore Kenya and Tanzania safaris', ar: 'استكشف رحلات كينيا وتنزانيا' },
  private_custom: { href: '/kenya-safari', en: 'Explore private Kenya safaris', ar: 'استكشف رحلات السفاري الخاصة في كينيا' },
  group_departure: { href: '/kenya-safari', en: 'Explore Kenya safari departures', ar: 'استكشف مواعيد رحلات سفاري كينيا' },
}

const DESTINATION_HUBS: { matches: string[]; link: ContextLink }[] = [
  { matches: ['maasai mara', 'masai mara'], link: { href: '/maasai-mara-safari', en: 'Plan a Maasai Mara safari', ar: 'خطط لرحلة سفاري ماساي مارا' } },
  { matches: ['amboseli'], link: { href: '/amboseli-safari', en: 'Plan an Amboseli safari', ar: 'خطط لرحلة سفاري أمبوسيلي' } },
]

export function contextualTourLinks(templateKey: string | null | undefined, destinationNames: string[], countries?: string | null): ContextLink[] {
  const links: ContextLink[] = []
  const templateLink = templateKey ? TEMPLATE_HUBS[templateKey] : undefined
  if (templateLink) links.push(templateLink)
  const haystack = destinationNames.join(' ').toLowerCase()
  for (const destination of DESTINATION_HUBS) {
    if (destination.matches.some((name) => haystack.includes(name))) links.push(destination.link)
  }
  if ((countries ?? '').toLowerCase().includes('tanzania')) links.push(TEMPLATE_HUBS.multi_country_safari)
  if (links.length === 0) links.push(TEMPLATE_HUBS.classic_safari)
  return [...new Map(links.map((link) => [link.href, link])).values()].slice(0, 3)
}

export type RelatedTourCandidate = {
  id: string
  slug: string | null
  title_en: string
  title_ar?: string | null
  overview_en?: string | null
  overview_ar?: string | null
  hero_image_url?: string | null
  duration_days?: number | null
  type?: string | null
  template_id?: string | null
  destination_ids?: string[]
}

export function rankRelatedTours(current: { id: string; template_id?: string | null; type?: string | null; duration_days?: number | null; destination_ids: string[] }, candidates: RelatedTourCandidate[], limit = 3) {
  const currentDestinations = new Set(current.destination_ids)
  return candidates
    .filter((candidate) => candidate.id !== current.id)
    .map((candidate) => {
      const overlap = (candidate.destination_ids ?? []).filter((id) => currentDestinations.has(id)).length
      const durationDifference = current.duration_days != null && candidate.duration_days != null
        ? Math.abs(current.duration_days - candidate.duration_days)
        : 99
      const score = (current.template_id && candidate.template_id === current.template_id ? 100 : 0)
        + overlap * 20
        + (current.type && candidate.type === current.type ? 10 : 0)
        + Math.max(0, 8 - durationDifference)
      return { candidate, score }
    })
    .sort((a, b) => b.score - a.score || a.candidate.title_en.localeCompare(b.candidate.title_en))
    .slice(0, limit)
    .map(({ candidate }) => candidate)
}

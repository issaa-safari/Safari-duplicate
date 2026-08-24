import { notFound, permanentRedirect } from 'next/navigation'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import WhatsAppButton from '@/components/public/whatsapp-button'
import SafariImage from '@/components/public/safari-image'
import TourHero from '@/components/public/tour-hero'
import ItineraryRouteLine from '@/components/public/itinerary-route-line'
import type { ItineraryDay } from '@/components/public/itinerary-route-line'
import ItineraryMap from '@/components/quote/itinerary-map'
import { buildTourMap } from '@/lib/tour-map'
import { googleMapsLinkFor, type LatLng } from '@/lib/geo'
import DepartureCards from '@/components/public/departure-cards'
import type { DepartureCardData } from '@/components/public/departure-cards'
import GalleryGrid from '@/components/public/gallery-grid'
import TrustStrip from '@/components/public/trust-strip'
import type { StaffMember } from '@/components/public/trust-strip'
import SectionReveal from '@/components/public/section-reveal'
import StickyEnquiryBar from '@/components/public/sticky-enquiry-bar'
import { getServerLocale } from '@/lib/i18n'
import { site, whatsappLink } from '@/lib/site'
import StructuredData, { touristTripJsonLd } from '@/components/public/structured-data'
import { breadcrumbJsonLd, faqPageJsonLd, hasArabicContent, languageAlternates, noindexIfUntranslated } from '@/lib/seo'
import { localePath } from '@/lib/locale'
import { isUuid } from '@/lib/slug'
import Breadcrumbs from '@/components/public/breadcrumbs'
import RelatedTours from '@/components/public/related-tours'
import SocialVideoGallery from '@/components/public/social-video-gallery'
import { contextualTourLinks, localisedSection, rankRelatedTours, type RelatedTourCandidate, type TourContentSection } from '@/lib/tour-seo-engine'
import type { SocialVideo } from '@/lib/social'

export const dynamic = 'force-dynamic'

const OLIVE = '#7A9A4A'
const BUSH = '#20271A'
const SAND = '#EAE3D2'
const STONE = '#6E6A59'

function accentFor(tripType: string | null): string {
  return tripType === 'bike' ? '#B0492B' : '#C9A24B'
}

function tripLabel(tripType: string | null, isAr: boolean): string | null {
  if (tripType === 'bike') return isAr ? 'جولة دراجات' : 'Bike Tour'
  if (tripType === 'private') return isAr ? 'سفاري خاص' : 'Private Safari'
  return null
}

function SectionHeading({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
      <div style={{ width: 4, height: 36, borderRadius: 99, background: accent, flexShrink: 0 }} />
      <h2 style={{
        fontFamily: 'var(--font-display, "Readex Pro", sans-serif)',
        fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
        fontWeight: 700,
        color: BUSH,
        margin: 0,
      }}>
        {children}
      </h2>
    </div>
  )
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const locale = await getServerLocale(sp)
  const supabase = await createClient()
  const { data: tour } = await supabase
    .from('tours')
    .select('id, slug, title_en, title_ar, overview_en, overview_ar, hero_image_url')
    .eq(isUuid(slug) ? 'id' : 'slug', slug)
    .eq('status', 'active')
    .eq('show_on_website', true)
    .maybeSingle()
  if (!tour) return {}
  const { data: seo } = await supabase
    .from('tour_seo')
    .select('seo_title_en, seo_title_ar, meta_description_en, meta_description_ar, og_title_en, og_title_ar, og_description_en, og_description_ar')
    .eq('tour_id', tour.id)
    .maybeSingle()
  // Always advertise the slug URL, even when reached by UUID, so the two forms
  // never compete for the same content in the index.
  const path = `/tours/${tour.slug ?? tour.id}`
  // An untranslated tour still renders at /ar/... in English; it just must not
  // be advertised or indexed as the Arabic edition.
  const translated = hasArabicContent(tour)
  const isAr = locale === 'ar'
  const title = isAr
    ? (seo?.seo_title_ar || tour.title_ar || tour.title_en)
    : (seo?.seo_title_en || tour.title_en)
  // Fall back to English so a tour with no Arabic overview still gets a snippet.
  const overview = isAr
    ? (seo?.meta_description_ar || tour.overview_ar || tour.overview_en)
    : (seo?.meta_description_en || tour.overview_en)
  const ogTitle = isAr ? (seo?.og_title_ar || title) : (seo?.og_title_en || title)
  const ogDescription = isAr ? (seo?.og_description_ar || overview) : (seo?.og_description_en || overview)
  return {
    ...noindexIfUntranslated(locale, translated),
    title: title ?? undefined,
    description: overview?.slice(0, 160) ?? undefined,
    alternates: {
      canonical: localePath(path, locale),
      languages: languageAlternates(path, translated),
    },
    openGraph: {
      title: ogTitle ?? undefined,
      description: ogDescription?.slice(0, 160) ?? undefined,
      url: localePath(path, locale),
      locale,
      images: tour.hero_image_url ? [tour.hero_image_url] : [],
    },
    twitter: {
      title: ogTitle ?? undefined,
      description: ogDescription?.slice(0, 160) ?? undefined,
      images: tour.hero_image_url ? [tour.hero_image_url] : [],
    },
  }
}

export default async function TourDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const locale = await getServerLocale(sp)
  const isAr = locale === 'ar'
  const supabase = await createClient()

  // ── Tour ─────────────────────────────────────────────────────────────────
  const { data: tour } = await supabase
    .from('tours')
    .select(`
      id, slug, title_en, title_ar, subtitle_en, subtitle_ar,
      overview_en, overview_ar, type,
      duration_days, duration_nights, countries_visited,
      start_destination, end_destination,
      hero_image_url, gallery_urls, route_map_url,
      highlights_en, highlights_ar,
      included_en, included_ar, excluded_en, excluded_ar,
      terrain, vehicle, accommodation_level,
      total_distance_km, difficulty_rating, max_group_size,
      faqs, status, template_id
    `)
    .eq(isUuid(slug) ? 'id' : 'slug', slug)
    .eq('status', 'active')
    .eq('show_on_website', true)
    .maybeSingle()

  if (!tour) notFound()

  // Reached by the old UUID URL: send it to the slug, permanently, so links
  // already out in the world consolidate onto one address.
  if (tour.slug && slug !== tour.slug) {
    permanentRedirect(localePath(`/tours/${tour.slug}`, locale))
  }
  const id = tour.id

  const [{ data: seo }, { data: template }, { data: rawSections }] = await Promise.all([
    supabase.from('tour_seo').select('*').eq('tour_id', id).maybeSingle(),
    tour.template_id
      ? supabase.from('tour_templates').select('id, key, name_en, name_ar, config_json').eq('id', tour.template_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('tour_content_sections').select('section_key, title_en, title_ar, content_en, content_ar, sort_order, is_enabled').eq('tour_id', id).eq('is_enabled', true).order('sort_order'),
  ])

  const accent = accentFor(tour.type)
  const title = isAr ? (tour.title_ar || tour.title_en) : tour.title_en
  const subtitle = isAr ? (tour.subtitle_ar || tour.subtitle_en) : tour.subtitle_en
  const overview = isAr ? (tour.overview_ar || tour.overview_en) : tour.overview_en
  const seoIntro = isAr ? (seo?.seo_intro_ar || null) : (seo?.seo_intro_en || null)
  const heroAlt = isAr ? (seo?.hero_alt_ar || title || '') : (seo?.hero_alt_en || title || '')
  const templateSections = ((rawSections ?? []) as TourContentSection[])
    .map((section) => localisedSection(section, locale))
    .filter((section): section is NonNullable<typeof section> => section !== null)
  const highlights: string[] = isAr
    ? ((tour.highlights_ar as string[] | null)?.filter(Boolean) ?? (tour.highlights_en as string[] | null)?.filter(Boolean) ?? [])
    : ((tour.highlights_en as string[] | null)?.filter(Boolean) ?? [])
  const included: string[] = isAr
    ? ((tour.included_ar as string[] | null)?.filter(Boolean) ?? (tour.included_en as string[] | null)?.filter(Boolean) ?? [])
    : ((tour.included_en as string[] | null)?.filter(Boolean) ?? [])
  const excluded: string[] = isAr
    ? ((tour.excluded_ar as string[] | null)?.filter(Boolean) ?? (tour.excluded_en as string[] | null)?.filter(Boolean) ?? [])
    : ((tour.excluded_en as string[] | null)?.filter(Boolean) ?? [])
  const gallery: string[] = Array.isArray(tour.gallery_urls) ? (tour.gallery_urls as string[]).filter(Boolean) : []
  const faqs: { q_en?: string; q_ar?: string; a_en?: string; a_ar?: string }[] = Array.isArray(tour.faqs) ? tour.faqs as { q_en?: string; q_ar?: string; a_en?: string; a_ar?: string }[] : []
  // Feed the FAQ rich-result markup only the pairs that render with both a
  // question and an answer — Google requires the schema to match what a
  // visitor can actually read on the page.
  const faqEntries = faqs
    .map((f) => ({
      question: (isAr ? f.q_ar || f.q_en : f.q_en || f.q_ar) ?? '',
      answer: (isAr ? f.a_ar || f.a_en : f.a_en || f.a_ar) ?? '',
    }))
    .filter((f) => f.question && f.answer)

  // Route text e.g. "Nairobi → Masai Mara → Nairobi" (arrow mirrors for RTL)
  const routeArrow = isAr ? ' ← ' : ' → '
  const routeText = tour.start_destination
    ? `${tour.start_destination}${tour.end_destination ? `${routeArrow}${tour.end_destination}` : ''}`
    : null

  // ── Tour days ─────────────────────────────────────────────────────────────
  const { data: rawDays } = await supabase
    .from('tour_days')
    .select('id, day_number, day_number_end, title_en, title_ar, destination_id, accommodation_id, meal_breakfast, meal_lunch, meal_dinner, distance_km, road_distance_km, image_url, activities')
    .eq('tour_id', id)
    .order('day_number')

  // Resolve destinations, accommodations, activities
  const destIds = [...new Set((rawDays ?? []).map(d => d.destination_id).filter(Boolean))] as string[]
  const accomIds = [...new Set((rawDays ?? []).map(d => d.accommodation_id).filter(Boolean))] as string[]
  const activityIds = [...new Set(
    (rawDays ?? []).flatMap(d =>
      (Array.isArray(d.activities) ? d.activities as { activity_id?: string }[] : [])
        .map(a => a.activity_id)
        .filter(Boolean)
    )
  )] as string[]

  const [destRes, accomRes, actRes] = await Promise.all([
    destIds.length ? supabase.from('destinations').select('id, name, description_en, description_ar, latitude, longitude').in('id', destIds) : { data: [] },
    accomIds.length ? supabase.from('accommodations').select('id, name, google_maps_url, google_place_id, latitude, longitude').in('id', accomIds) : { data: [] },
    activityIds.length ? supabase.from('activities').select('id, name, description_en, description_ar').in('id', activityIds) : { data: [] },
  ])

  const destMap: Record<string, { en: string | null; ar: string | null }> = {}
  const destCoordMap: Record<string, LatLng> = {}
  const destNameMap: Record<string, string> = {}
  for (const d of destRes.data ?? []) {
    destMap[d.id] = { en: d.description_en, ar: d.description_ar }
    destNameMap[d.id] = d.name
    if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
      destCoordMap[d.id] = { lat: d.latitude, lng: d.longitude }
    }
  }

  const contextualLinks = contextualTourLinks(template?.key, Object.values(destNameMap), tour.countries_visited)

  const [{ data: directVideos }, destinationVideoResult, { data: relatedCandidates }] = await Promise.all([
    supabase.from('social_videos').select('*').eq('is_published', true).eq('tour_id', id).order('sort_order').limit(6),
    destIds.length
      ? supabase.from('social_videos').select('*').eq('is_published', true).in('destination_id', destIds).order('sort_order').limit(6)
      : Promise.resolve({ data: [] }),
    supabase
      .from('tours')
      .select('id, slug, title_en, title_ar, overview_en, overview_ar, hero_image_url, duration_days, type, template_id')
      .eq('status', 'active')
      .eq('show_on_website', true)
      .neq('id', id)
      .limit(16),
  ])

  const socialVideos = [...new Map(
    ([...(directVideos ?? []), ...(destinationVideoResult.data ?? [])] as SocialVideo[]).map((video) => [video.id, video]),
  ).values()]

  const candidateIds = (relatedCandidates ?? []).map((candidate) => candidate.id)
  const { data: relatedDays } = candidateIds.length
    ? await supabase.from('tour_days').select('tour_id, destination_id').in('tour_id', candidateIds)
    : { data: [] }
  const candidateDestinations = new Map<string, string[]>()
  for (const day of relatedDays ?? []) {
    if (!day.destination_id) continue
    const ids = candidateDestinations.get(day.tour_id) ?? []
    if (!ids.includes(day.destination_id)) ids.push(day.destination_id)
    candidateDestinations.set(day.tour_id, ids)
  }
  const relatedTours = rankRelatedTours(
    { id, template_id: tour.template_id, type: tour.type, duration_days: tour.duration_days, destination_ids: destIds },
    (relatedCandidates ?? []).map((candidate) => ({ ...candidate, destination_ids: candidateDestinations.get(candidate.id) ?? [] })) as RelatedTourCandidate[],
  )

  const accomMap: Record<string, string> = {}
  const accomMapsUrlMap: Record<string, string | null> = {}
  for (const a of accomRes.data ?? []) {
    accomMap[a.id] = a.name
    accomMapsUrlMap[a.id] = googleMapsLinkFor(a)
  }

  const actMap: Record<string, { name: string; en: string | null; ar: string | null }> = {}
  for (const a of actRes.data ?? []) actMap[a.id] = { name: a.name, en: a.description_en, ar: a.description_ar }

  // Generated route map + per-day distance — same logic as the client
  // proposal's tour map (app/quote/[token]/page.tsx), built from tour_days'
  // own destinations rather than a quote's destination snapshots.
  const { mapStops, distanceByDayId, totalDistanceKm } = buildTourMap(
    (rawDays ?? []).map(d => ({
      id: d.id, day_number: d.day_number, destination_id: d.destination_id,
      distance_km: d.distance_km, road_distance_km: d.road_distance_km,
    })),
    destCoordMap,
    destNameMap,
  )
  // A manually-entered tour-level total (Tour Edit form) always wins over
  // the sum of computed per-day legs — same "admin input wins" rule as the
  // per-day distance itself.
  const displayTotalDistanceKm = tour.total_distance_km ?? totalDistanceKm

  const days: ItineraryDay[] = (rawDays ?? []).map(d => {
    const dest = d.destination_id ? destMap[d.destination_id] : null
    const rawActivities = Array.isArray(d.activities) ? d.activities as { activity_id?: string; moment?: string; optional?: boolean }[] : []
    return {
      id: d.id,
      dayNumber: d.day_number,
      dayNumberEnd: d.day_number_end ?? null,
      title: (isAr ? (d.title_ar || d.title_en) : d.title_en) ?? '',
      description: dest ? (isAr ? (dest.ar || dest.en) : dest.en) : null,
      imageUrl: (d as { image_url?: string | null }).image_url ?? null,
      distanceKm: distanceByDayId[d.id] ?? null,
      mealBreakfast: d.meal_breakfast ?? false,
      mealLunch: d.meal_lunch ?? false,
      mealDinner: d.meal_dinner ?? false,
      accommodation: d.accommodation_id ? (accomMap[d.accommodation_id] ?? null) : null,
      accommodationMapsUrl: d.accommodation_id ? (accomMapsUrlMap[d.accommodation_id] ?? null) : null,
      activities: rawActivities
        .map(a => {
          if (!a.activity_id) return null
          const info = actMap[a.activity_id]
          if (!info) return null
          return {
            name: info.name,
            description: isAr ? (info.ar || info.en) : info.en,
            moment: a.moment ?? null,
            optional: a.optional ?? false,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    }
  })

  // ── Upcoming departures ───────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const { data: rawDepartures } = await supabase
    .from('departures')
    .select('id, start_date, end_date, max_seats, booked_seats, price_usd, price_single_usd, security_deposit_usd, status')
    .eq('tour_id', id)
    .eq('is_active', true)
    .eq('is_public', true)
    .gte('start_date', today)
    .order('start_date')
    .limit(12)

  const departures: DepartureCardData[] = (rawDepartures ?? []).map(d => ({
    id: d.id,
    startDate: d.start_date,
    endDate: d.end_date,
    maxSeats: d.max_seats,
    bookedSeats: d.booked_seats,
    priceUsd: d.price_usd,
    priceSingleUsd: d.price_single_usd,
    securityDepositUsd: d.security_deposit_usd,
    status: d.status,
  }))

  // Lowest price for hero — a departure with no sharing price still has a
  // single-room price to consider, and vice versa.
  const lowestPrice = departures.reduce<number | null>((min, d) => {
    const price = d.priceUsd ?? d.priceSingleUsd
    if (price == null) return min
    return min == null || price < min ? price : min
  }, null)

  const hasAvailable = departures.some(d => d.maxSeats - d.bookedSeats > 0 && d.status !== 'cancelled')

  // ── Staff ─────────────────────────────────────────────────────────────────
  const { data: rawStaff } = await supabase
    .from('tour_staff')
    .select('id, name, role')
    .eq('is_active', true)
    .limit(8)

  const staff: StaffMember[] = (rawStaff ?? []).map(s => ({ id: s.id, name: s.name, role: s.role }))

  const enquireHref = `${localePath('/quote-request', locale)}?tour=${id}`
  // Book Now scrolls to the Dates & Availability section — the traveller picks a specific
  // departure there, and that date's own "Book" button carries it to the booking form.
  const bookHref = departures.length > 0 ? '#departures' : enquireHref
  const waHref = whatsappLink(isAr ? `مرحباً، أريد الاستفسار عن جولة: ${title}` : `Hi, I'd like to enquire about: ${title}`)

  const t = isAr ? {
    overview: 'نظرة عامة', highlights: 'أبرز ما في الرحلة',
    itinerary: 'البرنامج اليومي', included: 'ما يشمله السعر',
    excluded: 'ما لا يشمله السعر', gallery: 'معرض الصور',
    departures: 'المواعيد المتاحة', trust: 'لماذا نحن؟',
    routeMap: 'خريطة المسار', faqs: 'الأسئلة الشائعة',
    ctaTitle: 'هل أنت مستعد لهذه المغامرة؟',
    ctaText: 'احجز مقعدك مباشرة، أو تواصل معنا وسنساعدك في التخطيط.',
    bookNow: 'احجز الآن', sendInquiry: 'أرسل استفساراً', whatsapp: 'واتساب',
    more: 'استكشف المزيد', home: 'الرئيسية', tours: 'الرحلات',
  } : {
    overview: 'Tour Overview', highlights: 'Tour Highlights',
    itinerary: 'Day-by-Day Itinerary', included: "What's Included",
    excluded: "What's Excluded", gallery: 'Photo Gallery',
    departures: 'Dates & Availability', trust: 'Why Us',
    routeMap: 'Route Map', faqs: 'FAQs',
    ctaTitle: 'Ready for this adventure?',
    ctaText: "Book your spot directly, or reach out and we'll help you plan it.",
    bookNow: 'Book Now', sendInquiry: 'Send an Enquiry', whatsapp: 'WhatsApp',
    more: 'Explore More', home: 'Home', tours: 'Tours',
  }

  const tourPath = `/tours/${tour.slug ?? id}`
  const breadcrumbItems = [
    { label: t.home, href: '/' },
    { label: t.tours, href: '/tours' },
    { label: title ?? '', href: tourPath },
  ]

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ background: '#fff' }}>
      <StructuredData
        data={touristTripJsonLd({
          url: `${site.url}${localePath(`/tours/${tour.slug ?? id}`, locale)}`,
          name: title ?? '',
          description: overview,
          image: tour.hero_image_url,
          durationDays: tour.duration_days,
          priceUsd: lowestPrice,
          available: hasAvailable,
          providerName: site.name,
          providerUrl: site.url,
        })}
      />
      {faqEntries.length > 0 && <StructuredData data={faqPageJsonLd(faqEntries)} />}
      <StructuredData data={breadcrumbJsonLd(breadcrumbItems.map((item) => ({ label: item.label, href: item.href })), locale)} />
      <Suspense><PublicHeader initialLang={locale} /></Suspense>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '18px 24px' }}>
        <Breadcrumbs items={breadcrumbItems} locale={locale} />
      </div>

      {/* 1. Hero */}
      <TourHero
        tourTitle={title ?? ''}
        subtitle={subtitle}
        routeText={routeText}
        durationDays={tour.duration_days}
        distanceKm={displayTotalDistanceKm}
        groupSize={tour.max_group_size}
        terrain={tour.terrain}
        accentColor={accent}
        price={lowestPrice}
        isAvailable={hasAvailable}
        bookHref={bookHref}
        enquireHref={enquireHref}
        isAr={isAr}
        tripLabel={tripLabel(tour.type, isAr)}
        tourId={id}
        tourSlug={tour.slug ?? id}
        tourTemplate={template?.key ?? null}
        locale={locale}
        imageSlot={
          <SafariImage
            src={tour.hero_image_url}
            seed={id}
            alt={heroAlt}
            className="w-full h-full"
            sizes="100vw"
            priority
          />
        }
      />

      {/* 2. Sticky enquiry bar — slides in once the hero (#tour-hero) scrolls out of view */}
      <StickyEnquiryBar
        price={lowestPrice}
        accentColor={accent}
        enquireHref={enquireHref}
        whatsappHref={waHref}
        isAr={isAr}
        isAvailable={hasAvailable}
        bookHref={bookHref}
        heroElementId="tour-hero"
        analytics={{ tourId: id, tourSlug: tour.slug ?? id, tourTemplate: template?.key ?? null, locale }}
      />

      {/* 3. Overview + quick facts */}
      {(seoIntro || overview || tour.difficulty_rating || tour.vehicle || tour.accommodation_level) && (
        <section style={{ padding: '72px 24px', background: '#fff' }}>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-12 items-start" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <SectionReveal>
              <SectionHeading accent={accent}>{t.overview}</SectionHeading>
              {seoIntro && (
                <p style={{
                  fontSize: '1.05rem', lineHeight: 1.8, color: '#3D3D35',
                  fontFamily: isAr ? 'var(--font-body-ar, var(--font-body, sans-serif))' : 'var(--font-body, sans-serif)',
                  whiteSpace: 'pre-line', maxWidth: 680,
                }}>
                  {seoIntro}
                </p>
              )}
              {overview && overview.trim() !== seoIntro?.trim() && (
                <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: '#3D3D35', fontFamily: isAr ? 'var(--font-body-ar, var(--font-body, sans-serif))' : 'var(--font-body, sans-serif)', whiteSpace: 'pre-line', maxWidth: 680, marginTop: seoIntro ? 18 : 0 }}>
                  {overview}
                </p>
              )}
            </SectionReveal>

            {/* Quick facts sidebar */}
            <SectionReveal delay={0.1}>
              <div style={{
                background: SAND, borderRadius: 16, padding: '28px 24px',
                display: 'flex', flexDirection: 'column', gap: 16,
                minWidth: 220, border: '1px solid #DDD8CC',
              }}>
                {[
                  tour.duration_days && { label: isAr ? 'المدة' : 'Duration', value: `${tour.duration_days} ${isAr ? 'يوم' : 'days'}` },
                  displayTotalDistanceKm && { label: isAr ? 'المسافة الكلية' : 'Total Distance', value: `${displayTotalDistanceKm.toLocaleString()} km` },
                  tour.difficulty_rating && { label: isAr ? 'الصعوبة' : 'Difficulty', value: `${tour.difficulty_rating}/10` },
                  tour.max_group_size && { label: isAr ? 'حجم المجموعة' : 'Group Size', value: `Max ${tour.max_group_size}` },
                  tour.terrain && { label: isAr ? 'التضاريس' : 'Terrain', value: tour.terrain },
                  tour.vehicle && { label: isAr ? 'المركبة' : 'Vehicle', value: tour.vehicle },
                  tour.accommodation_level && { label: isAr ? 'مستوى الإقامة' : 'Accommodation', value: tour.accommodation_level },
                  routeText && { label: isAr ? 'المسار' : 'Route', value: routeText },
                ].filter(Boolean).map((fact) => {
                  if (!fact) return null
                  return (
                    <div key={fact.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', borderBottom: '1px solid #DDD8CC', paddingBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: STONE, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-body, sans-serif)' }}>{fact.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: BUSH, fontFamily: 'var(--font-display, sans-serif)', textAlign: 'right' }}>{fact.value}</span>
                    </div>
                  )
                })}
              </div>
            </SectionReveal>
          </div>
        </section>
      )}

      {/* 4. Route map — generated from the itinerary's own destinations,
          same as the client proposal's tour map (no manual upload). */}
      {mapStops.length >= 2 && (
        <section style={{ padding: '0 24px 72px', background: '#fff' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <SectionReveal>
              <SectionHeading accent={accent}>{t.routeMap}</SectionHeading>
              <ItineraryMap stops={mapStops} width={1100} height={480} />
            </SectionReveal>
          </div>
        </section>
      )}

      {/* 5. Itinerary */}
      {days.length > 0 && (
        <section style={{ padding: '72px 24px', background: SAND }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <SectionReveal>
              <SectionHeading accent={accent}>{t.itinerary}</SectionHeading>
            </SectionReveal>
            <ItineraryRouteLine days={days} accentColor={accent} isAr={isAr} />
          </div>
        </section>
      )}

      {/* Highlights */}
      {highlights.length > 0 && (
        <section style={{ padding: '72px 24px', background: '#fff' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <SectionReveal>
              <SectionHeading accent={accent}>{t.highlights}</SectionHeading>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {highlights.map((h, i) => (
                  <SectionReveal key={i} delay={i * 0.06}>
                    <div style={{
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                      background: SAND, borderRadius: 10, padding: '16px 18px',
                      border: '1px solid #DDD8CC',
                    }}>
                      <span style={{ color: accent, fontSize: 18, flexShrink: 0, marginTop: 1 }}>✦</span>
                      <span style={{ color: BUSH, fontFamily: 'var(--font-body, sans-serif)', lineHeight: 1.6 }}>{h}</span>
                    </div>
                  </SectionReveal>
                ))}
              </div>
            </SectionReveal>
          </div>
        </section>
      )}

      {templateSections.length > 0 && (
        <section style={{ padding: '72px 24px', background: SAND }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            {templateSections.map((section) => (
              <article key={section.key} style={{ padding: '24px 22px', borderRadius: 12, background: '#fff', border: '1px solid #DDD8CC' }}>
                <h2 style={{ color: BUSH, fontFamily: 'var(--font-display, sans-serif)', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 10px' }}>{section.title}</h2>
                <p style={{ color: '#3D3D35', fontFamily: 'var(--font-body, sans-serif)', lineHeight: 1.75, whiteSpace: 'pre-line', margin: 0 }}>{section.content}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 6. Included / Excluded */}
      {(included.length > 0 || excluded.length > 0) && (
        <section style={{ padding: '72px 24px', background: SAND }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10" style={{ maxWidth: 1100, margin: '0 auto' }}>
            {included.length > 0 && (
              <SectionReveal>
                <h3 style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '1.2rem', fontWeight: 700, color: BUSH, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: OLIVE }}>✓</span> {t.included}
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {included.map((item, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, color: '#3D3D35', fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.95rem' }}>
                      <span style={{ color: OLIVE, flexShrink: 0 }}>✓</span>{item}
                    </li>
                  ))}
                </ul>
              </SectionReveal>
            )}
            {excluded.length > 0 && (
              <SectionReveal delay={0.1}>
                <h3 style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '1.2rem', fontWeight: 700, color: BUSH, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#B0492B' }}>✕</span> {t.excluded}
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {excluded.map((item, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, color: '#3D3D35', fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.95rem' }}>
                      <span style={{ color: '#B0492B', flexShrink: 0 }}>✕</span>{item}
                    </li>
                  ))}
                </ul>
              </SectionReveal>
            )}
          </div>
        </section>
      )}

      {/* 7. Gallery */}
      {gallery.length > 0 && (
        <section style={{ padding: '72px 24px', background: '#fff' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <SectionReveal>
              <SectionHeading accent={accent}>{t.gallery}</SectionHeading>
            </SectionReveal>
            <GalleryGrid urls={gallery} tourId={id} alt={title ?? ''} isAr={isAr} />
          </div>
        </section>
      )}

      <SocialVideoGallery videos={socialVideos} locale={locale} />

      {/* 8. Departures */}
      <section id="departures" style={{ padding: '72px 24px', background: BUSH, color: '#fff', scrollMarginTop: 80 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionReveal>
            <SectionHeading accent={accent}>
              <span style={{ color: '#fff' }}>{t.departures}</span>
            </SectionHeading>
          </SectionReveal>
          <DepartureCards
            departures={departures}
            accentColor={accent}
            isAr={isAr}
            tourTitle={title ?? ''}
            locale={locale}
            tourId={id}
            tourSlug={tour.slug ?? id}
            tourTemplate={template?.key ?? null}
          />
        </div>
      </section>

      {/* 9. Trust strip */}
      <section style={{ padding: '72px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionReveal>
            <SectionHeading accent={accent}>{t.trust}</SectionHeading>
          </SectionReveal>
          <TrustStrip
            staff={staff}
            isAr={isAr}
            accentColor={accent}
            maxGroupSize={tour.max_group_size}
          />
        </div>
      </section>

      {/* FAQs */}
      {faqs.length > 0 && (
        <section style={{ padding: '72px 24px', background: SAND }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <SectionReveal>
              <SectionHeading accent={accent}>{t.faqs}</SectionHeading>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {faqs.map((f, i) => {
                  const q = isAr ? (f.q_ar || f.q_en) : (f.q_en || f.q_ar)
                  const a = isAr ? (f.a_ar || f.a_en) : (f.a_en || f.a_ar)
                  if (!q) return null
                  return (
                    <details key={i} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', border: '1px solid #DDD8CC' }}>
                      <summary style={{ fontWeight: 600, color: BUSH, cursor: 'pointer', fontFamily: 'var(--font-body, sans-serif)' }}>{q}</summary>
                      {a && <p style={{ color: STONE, marginTop: 10, lineHeight: 1.7, fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.95rem' }}>{a}</p>}
                    </details>
                  )
                })}
              </div>
            </SectionReveal>
          </div>
        </section>
      )}

      <section style={{ padding: '56px 24px', background: SAND }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ color: BUSH, fontFamily: 'var(--font-display, sans-serif)', fontSize: '1.35rem', fontWeight: 700, margin: '0 0 18px' }}>{t.more}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {contextualLinks.map((item) => (
              <Link key={item.href} href={localePath(item.href, locale)} style={{ border: `1px solid ${OLIVE}`, borderRadius: 99, padding: '10px 16px', color: '#3D5229', background: '#fff', fontWeight: 700, textDecoration: 'none' }}>
                {isAr ? item.ar : item.en}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <RelatedTours tours={relatedTours} locale={locale} />

      {/* 11. Final CTA — book first, enquiry and WhatsApp as fallbacks */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <SectionReveal>
            <h2 style={{
              fontFamily: 'var(--font-display, "Readex Pro", sans-serif)',
              fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', fontWeight: 700, color: BUSH, margin: '0 0 12px',
            }}>
              {t.ctaTitle}
            </h2>
            <p style={{ color: STONE, marginBottom: 32, fontFamily: 'var(--font-body, sans-serif)', fontSize: '1rem' }}>
              {t.ctaText}
            </p>
          </SectionReveal>
          <SectionReveal delay={0.1}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
              {hasAvailable && (
                <a href={bookHref} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 8,
                  background: accent, color: '#fff',
                  fontWeight: 700, fontSize: 15, textDecoration: 'none',
                  fontFamily: 'var(--font-body, sans-serif)',
                }}>
                  {t.bookNow}
                </a>
              )}
              <a href={enquireHref} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 8,
                background: OLIVE, color: '#fff',
                fontWeight: 600, fontSize: 15, textDecoration: 'none',
                fontFamily: 'var(--font-body, sans-serif)',
              }}>
                {t.sendInquiry}
              </a>
              <a href={waHref} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 8,
                background: '#25D366', color: '#fff',
                fontWeight: 600, fontSize: 15, textDecoration: 'none',
                fontFamily: 'var(--font-body, sans-serif)',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {t.whatsapp}
              </a>
            </div>
          </SectionReveal>
        </div>
      </section>

      <PublicFooter />
      <WhatsAppButton lang={locale} />
    </div>
  )
}

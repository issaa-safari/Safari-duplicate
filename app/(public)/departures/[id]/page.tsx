import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import WhatsAppButton from '@/components/public/whatsapp-button'
import SafariImage from '@/components/public/safari-image'
import ItineraryRouteLine from '@/components/public/itinerary-route-line'
import type { ItineraryDay } from '@/components/public/itinerary-route-line'
import ItineraryMap from '@/components/quote/itinerary-map'
import { buildTourMap } from '@/lib/tour-map'
import { googleMapsLinkFor, type LatLng } from '@/lib/geo'
import GalleryGrid from '@/components/public/gallery-grid'
import SectionReveal from '@/components/public/section-reveal'
import DepartureHero from '@/components/public/departure-hero'
import StickyEnquiryBar from '@/components/public/sticky-enquiry-bar'
import { getServerLocale } from '@/lib/i18n'
import { site, whatsappLink } from '@/lib/site'
import StructuredData, { touristTripJsonLd } from '@/components/public/structured-data'
import { hasArabicContent, languageAlternates, noindexIfUntranslated } from '@/lib/seo'
import { localePath } from '@/lib/locale'
import { departureBookHref } from '@/lib/departure-booking-link'

export const dynamic = 'force-dynamic'

const BUSH = '#20271A'
const STONE = '#6E6A59'
const SAND = '#EAE3D2'
const OLIVE = '#7A9A4A'

function accentFor(tripType: string | null): string {
  return tripType === 'bike' ? '#B0492B' : '#C9A24B'
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

function formatDate(dateStr: string, locale: string = 'en') {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (locale === 'ar') {
    return date.toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getDaysCount(start: string, end: string) {
  if (!start || !end) return 0
  const startDate = new Date(start)
  const endDate = new Date(end)
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function mealsLabel(day: { meal_breakfast?: boolean; meal_lunch?: boolean; meal_dinner?: boolean }, locale: string) {
  const parts: string[] = []
  if (locale === 'ar') {
    if (day.meal_breakfast) parts.push('فطور')
    if (day.meal_lunch) parts.push('غداء')
    if (day.meal_dinner) parts.push('عشاء')
    return parts.length ? parts.join('، ') : 'لا توجد وجبات مدرجة'
  }
  if (day.meal_breakfast) parts.push('Breakfast')
  if (day.meal_lunch) parts.push('Lunch')
  if (day.meal_dinner) parts.push('Dinner')
  return parts.length ? parts.join(', ') : 'No meals included'
}

function dayLabel(day: { day_number: number; day_number_end?: number | null }, locale: string) {
  const base = locale === 'ar' ? 'اليوم' : 'Day'
  if (day.day_number_end && day.day_number_end !== day.day_number) {
    return `${base} ${day.day_number}–${day.day_number_end}`
  }
  return `${base} ${day.day_number}`
}

const momentLabel = (m: string, isAr: boolean) => {
  const map: Record<string, [string, string]> = {
    morning: ['Morning', 'صباحاً'],
    afternoon: ['Afternoon', 'بعد الظهر'],
    evening: ['Evening', 'مساءً'],
    night: ['Night', 'ليلاً'],
  }
  return map[m] ? (isAr ? map[m][1] : map[m][0]) : ''
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lang?: string }>
}): Promise<Metadata> {
  const { id } = await params
  const sp = await searchParams
  const locale = await getServerLocale(sp)
  const supabase = await createClient()
  const { data: dep } = await supabase
    .from('departures')
    .select('start_date, end_date, tours(title_en, title_ar, overview_ar, hero_image_url)')
    .eq('id', id)
    .maybeSingle()
  if (!dep) return {}
  const tour = dep.tours as any
  const title = locale === 'ar' ? (tour?.title_ar || tour?.title_en) : tour?.title_en
  if (!title) return { alternates: { canonical: localePath(`/departures/${id}`, locale) } }
  // A departure is a date on a tour, so it is only as translated as its tour.
  const translated = hasArabicContent(tour ?? {})
  const heading = `${title} — ${formatDate(dep.start_date, locale)}`
  const description =
    locale === 'ar'
      ? `رحلة ${title} تنطلق في ${formatDate(dep.start_date, locale)}. اطّلع على المقاعد المتاحة والسعر للفرد واحجز مباشرة.`
      : `${title} departing ${formatDate(dep.start_date, locale)}. Check remaining seats, per-person pricing, and book direct with the operator.`
  return {
    ...noindexIfUntranslated(locale, translated),
    title: heading,
    description,
    alternates: {
      canonical: localePath(`/departures/${id}`, locale),
      languages: languageAlternates(`/departures/${id}`, translated),
    },
    openGraph: {
      title: heading,
      description,
      url: localePath(`/departures/${id}`, locale),
      locale,
      images: tour?.hero_image_url ? [tour.hero_image_url] : [],
    },
  }
}

export default async function DepartureDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const locale = await getServerLocale(sp)
  const isAr = locale === 'ar'
  const dir = isAr ? 'rtl' : 'ltr'

  const supabase = await createClient()

  // ── Departure ──────────────────────────────────────────────────────────────
  const { data: departure } = await supabase
    .from('departures')
    .select(`
      id, tour_id, start_date, end_date,
      max_seats, booked_seats, price_usd, price_single_usd, security_deposit_usd, status, is_active,
      tours (
        id, slug, title_en, title_ar, subtitle_en, subtitle_ar,
        overview_en, overview_ar, type,
        countries_visited, start_destination, end_destination,
        hero_image_url, gallery_urls, route_map_url,
        highlights_en, highlights_ar,
        included_en, included_ar, excluded_en, excluded_ar,
        terrain, vehicle, accommodation_level,
        total_distance_km, difficulty_rating, max_group_size,
        faqs
      )
    `)
    .eq('id', id)
    .single()

  if (!departure) notFound()

  const tour = departure.tours as any
  // Link back to the tour by its slug; falls back to the id for a tour whose
  // title has no latin characters to slugify.
  const tourSlug: string | null = tour?.slug ?? null
  const accent = accentFor(tour?.type ?? null)
  const daysCount = getDaysCount(departure.start_date, departure.end_date)
  const availableSpots = departure.max_seats - departure.booked_seats
  const isAvailable = availableSpots > 0 && departure.status === 'available'

  const title = isAr ? (tour?.title_ar || tour?.title_en) : tour?.title_en
  const overview = isAr ? (tour?.overview_ar || tour?.overview_en) : (tour?.overview_en || tour?.subtitle_en)

  const pickList = (en?: string[] | null, ar?: string[] | null): string[] => {
    const a = Array.isArray(ar) ? ar.filter(Boolean) : []
    const e = Array.isArray(en) ? en.filter(Boolean) : []
    return isAr ? (a.length ? a : e) : (e.length ? e : a)
  }

  const highlights = pickList(tour?.highlights_en, tour?.highlights_ar)
  const included = pickList(tour?.included_en, tour?.included_ar)
  const excluded = pickList(tour?.excluded_en, tour?.excluded_ar)
  const gallery: string[] = Array.isArray(tour?.gallery_urls) ? (tour.gallery_urls as string[]).filter(Boolean) : []
  const faqs: { q_en?: string; q_ar?: string; a_en?: string; a_ar?: string }[] = Array.isArray(tour?.faqs) ? tour.faqs : []

  // ── Tour days ──────────────────────────────────────────────────────────────
  const { data: rawDays } = await supabase
    .from('tour_days')
    .select('id, day_number, day_number_end, title_en, title_ar, destination_id, accommodation_id, meal_breakfast, meal_lunch, meal_dinner, distance_km, road_distance_km, image_url, activities')
    .eq('tour_id', departure.tour_id)
    .order('day_number')

  const tourDays = rawDays ?? []

  // Resolve destination descriptions + coordinates
  const destIds = [...new Set(tourDays.map(d => d.destination_id).filter(Boolean))] as string[]
  const destMap: Record<string, { en: string | null; ar: string | null }> = {}
  const destCoordMap: Record<string, LatLng> = {}
  const destNameMap: Record<string, string> = {}
  if (destIds.length > 0) {
    const { data: dests } = await supabase.from('destinations').select('id, name, description_en, description_ar, latitude, longitude').in('id', destIds)
    for (const d of dests ?? []) {
      destMap[d.id] = { en: d.description_en, ar: d.description_ar }
      destNameMap[d.id] = d.name
      if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
        destCoordMap[d.id] = { lat: d.latitude, lng: d.longitude }
      }
    }
  }

  // Generated route map + per-day distance — same logic as the client
  // proposal's tour map (app/quote/[token]/page.tsx).
  const { mapStops, distanceByDayId, totalDistanceKm } = buildTourMap(
    tourDays.map(d => ({
      id: d.id, day_number: d.day_number, destination_id: d.destination_id,
      distance_km: d.distance_km, road_distance_km: (d as any).road_distance_km ?? null,
    })),
    destCoordMap,
    destNameMap,
  )
  // A manually-entered tour-level total (Tour Edit form) always wins over
  // the sum of computed per-day legs — same "admin input wins" rule as the
  // per-day distance itself.
  const displayTotalDistanceKm = tour?.total_distance_km ?? totalDistanceKm

  // Resolve accommodation names
  const accomIds = [...new Set(tourDays.map(d => d.accommodation_id).filter(Boolean))] as string[]
  const accomMap: Record<string, string> = {}
  const accomMapsUrlMap: Record<string, string | null> = {}
  if (accomIds.length > 0) {
    const { data: accoms } = await supabase.from('accommodations').select('id, name, google_maps_url, google_place_id, latitude, longitude').in('id', accomIds)
    for (const a of accoms ?? []) {
      accomMap[a.id] = a.name
      accomMapsUrlMap[a.id] = googleMapsLinkFor(a)
    }
  }

  // Resolve activity names
  const actIds = [...new Set(
    tourDays.flatMap(d => (Array.isArray(d.activities) ? d.activities : []).map((a: any) => a.activity_id))
  ).values()].filter(Boolean) as string[]
  const activityMap: Record<string, { name: string; en: string | null; ar: string | null }> = {}
  if (actIds.length > 0) {
    const { data: acts } = await supabase.from('activities').select('id, name, description_en, description_ar').in('id', actIds)
    for (const a of acts ?? []) activityMap[a.id] = { name: a.name, en: a.description_en, ar: a.description_ar }
  }

  // Build ItineraryDay[] for the route-line component
  const itineraryDays: ItineraryDay[] = tourDays.map(d => {
    const dd = d.destination_id ? destMap[d.destination_id] : null
    return {
      id: d.id,
      dayNumber: d.day_number,
      dayNumberEnd: d.day_number_end ?? null,
      title: isAr ? (d.title_ar || d.title_en || '') : (d.title_en ?? ''),
      description: dd ? (isAr ? (dd.ar || dd.en) : dd.en) ?? null : null,
      imageUrl: (d as any).image_url ?? null,
      mealBreakfast: d.meal_breakfast ?? false,
      mealLunch: d.meal_lunch ?? false,
      mealDinner: d.meal_dinner ?? false,
      distanceKm: distanceByDayId[d.id] ?? null,
      accommodation: d.accommodation_id ? accomMap[d.accommodation_id] ?? null : null,
      accommodationMapsUrl: d.accommodation_id ? accomMapsUrlMap[d.accommodation_id] ?? null : null,
      activities: (Array.isArray(d.activities) ? d.activities : []).map((a: any) => ({
        name: activityMap[a.activity_id]?.name ?? '',
        description: isAr
          ? (activityMap[a.activity_id]?.ar || activityMap[a.activity_id]?.en || null)
          : (activityMap[a.activity_id]?.en ?? null),
        moment: a.moment ?? null,
        optional: a.optional ?? false,
      })),
    }
  })

  const depositUsd = Number(departure.security_deposit_usd) || 0
  // Either room-type price can be unset on a departure, meaning that category
  // isn't offered — build the booking link with whichever prices actually exist.
  const sharingUsd = departure.price_usd != null ? Number(departure.price_usd) : null
  const singleUsd = departure.price_single_usd != null ? Number(departure.price_single_usd) : null
  const displayUsd = sharingUsd ?? singleUsd
  const bookHref = departureBookHref({
    departureId: id,
    locale,
    tourTitle: title ?? '',
    priceUsd: sharingUsd,
    priceSingleUsd: singleUsd,
    depositUsd,
  })
  const waHref = whatsappLink(`Hi, I'm interested in the ${title} departure on ${formatDate(departure.start_date, 'en')}`)
  const enquireHref = `${localePath('/quote-request', locale)}?tour=${departure.tour_id}`

  const t = isAr ? {
    backToTour: 'العودة إلى الجولة',
    departure: 'موعد الرحلة',
    bookNow: 'احجز الآن',
    enquire: 'استفسر عن هذا الموعد',
    whatsapp: 'واتساب',
    days: 'أيام',
    startDate: 'تاريخ البدء',
    endDate: 'تاريخ الانتهاء',
    duration: 'المدة',
    spots: 'المقاعد المتاحة',
    price: 'السعر',
    perPerson: 'للفرد',
    status: 'الحالة',
    terrain: 'التضاريس',
    vehicle: 'المركبة',
    accommodationLevel: 'مستوى الإقامة',
    totalDistance: 'إجمالي المسافة',
    difficulty: 'الصعوبة',
    groupSize: 'حجم المجموعة',
    overview: 'نظرة عامة',
    routeMap: 'خريطة المسار',
    highlights: 'أبرز ما في الرحلة',
    itinerary: 'برنامج الرحلة',
    included: 'ما يشمله السعر',
    excluded: 'ما لا يشمله السعر',
    gallery: 'معرض الصور',
    faqs: 'الأسئلة الشائعة',
    enquireForm: 'أرسل استفساراً',
    ctaTitle: 'هل أنت مستعد لهذه المغامرة؟',
    ctaText: 'احجز مقعدك مباشرة، أو تواصل معنا وسنساعدك في التخطيط.',
    fullyBooked: 'مكتمل الحجز',
    available: 'متاح',
    guaranteed: 'مضمون',
    securityDeposit: 'تأمين قابل للاسترداد',
    perRider: 'لكل سائق دراجة، يُعاد عند نهاية الرحلة',
    singleRoom: 'غرفة خاصة',
  } : {
    backToTour: 'Back to Tour',
    departure: 'Departure',
    bookNow: 'Book Now',
    enquire: 'Enquire About This Date',
    whatsapp: 'WhatsApp',
    days: 'days',
    startDate: 'Start Date',
    endDate: 'End Date',
    duration: 'Duration',
    spots: 'Spots Available',
    price: 'Price',
    perPerson: 'per person',
    status: 'Status',
    terrain: 'Terrain',
    vehicle: 'Vehicle',
    accommodationLevel: 'Accommodation',
    totalDistance: 'Total Distance',
    difficulty: 'Difficulty',
    groupSize: 'Group Size',
    overview: 'Tour Overview',
    routeMap: 'Route Map',
    highlights: 'Tour Highlights',
    itinerary: 'Day-by-Day Itinerary',
    included: "What's Included",
    excluded: "What's Excluded",
    gallery: 'Photo Gallery',
    faqs: 'Frequently Asked Questions',
    enquireForm: 'Send an Enquiry',
    ctaTitle: 'Ready for this adventure?',
    ctaText: "Book your spot directly, or reach out and we'll help you plan it.",
    fullyBooked: 'Fully Booked',
    available: 'Available',
    guaranteed: 'Guaranteed',
    securityDeposit: 'Refundable security deposit',
    perRider: 'per rider, returned at the end of the trip',
    singleRoom: 'Single room',
  }

  const statusLabel = departure.status === 'guaranteed' ? t.guaranteed
    : departure.status === 'available' ? t.available
    : t.fullyBooked

  const statusColor = departure.status === 'guaranteed' ? '#166534'
    : departure.status === 'available' ? OLIVE
    : '#991B1B'

  return (
    <div dir={dir}>
      <StructuredData
        data={touristTripJsonLd({
          url: `${site.url}/departures/${id}`,
          name: title ?? '',
          description: overview,
          image: tour?.hero_image_url,
          durationDays: daysCount,
          priceUsd: displayUsd,
          startDate: departure.start_date,
          endDate: departure.end_date,
          available: isAvailable,
          providerName: site.name,
          providerUrl: site.url,
        })}
      />
      <Suspense>
        <PublicHeader initialLang={locale} />
      </Suspense>

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <DepartureHero
          tourTitle={title ?? ''}
          backToTourHref={localePath(`/tours/${tourSlug ?? departure.tour_id}`, locale)}
          backToTourLabel={t.backToTour}
          departureLabel={t.departure}
          dateRangeText={`${formatDate(departure.start_date, locale)} ${isAr ? '←' : '→'} ${formatDate(departure.end_date, locale)}`}
          daysCount={daysCount}
          daysLabel={t.days}
          statusLabel={statusLabel}
          statusColor={statusColor}
          priceUsd={sharingUsd}
          perPersonLabel={t.perPerson}
          singleRoomUsd={singleUsd}
          singleRoomLabel={t.singleRoom}
          depositUsd={depositUsd > 0 ? depositUsd : null}
          depositLabel={t.securityDeposit}
          depositSubLabel={t.perRider}
          isAvailable={isAvailable}
          bookHref={bookHref}
          bookNowLabel={t.bookNow}
          whatsappHref={waHref}
          whatsappLabel={t.whatsapp}
          accentColor={accent}
          isAr={isAr}
          imageSlot={
            <SafariImage
              src={tour?.hero_image_url}
              seed={departure.tour_id}
              alt={title ?? ''}
              className="w-full h-full"
              sizes="100vw"
              priority
            />
          }
        />

        <StickyEnquiryBar
          price={displayUsd}
          accentColor={accent}
          enquireHref={enquireHref}
          whatsappHref={waHref}
          isAr={isAr}
          isAvailable={isAvailable}
          bookHref={bookHref}
          heroElementId="departure-hero"
        />

        {/* ── Quick facts bar ───────────────────────────────────────────────── */}
        <section style={{ padding: '40px 24px', background: '#fff' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <SectionReveal>
              <div style={{
                background: SAND, borderRadius: 16, padding: '8px 8px',
                display: 'flex', flexWrap: 'wrap',
                border: '1px solid #DDD8CC',
              }}>
                {([
                  { label: t.startDate, value: formatDate(departure.start_date, locale) },
                  { label: t.endDate, value: formatDate(departure.end_date, locale) },
                  { label: t.duration, value: `${daysCount} ${t.days}` },
                  { label: t.spots, value: `${availableSpots} / ${departure.max_seats}` },
                  { label: t.status, value: statusLabel, color: statusColor },
                  ...(displayTotalDistanceKm ? [{ label: t.totalDistance, value: `${displayTotalDistanceKm.toLocaleString()} km` }] : []),
                  ...(tour?.terrain ? [{ label: t.terrain, value: tour.terrain as string }] : []),
                  ...(tour?.difficulty_rating ? [{ label: t.difficulty, value: `${tour.difficulty_rating}/10` }] : []),
                  ...(tour?.max_group_size ? [{ label: t.groupSize, value: `Max ${tour.max_group_size}` }] : []),
                ] as { label: string; value: string; color?: string }[]).map((fact, i) => (
                  <div key={i} style={{ padding: '16px 20px', minWidth: 130, flex: '1 1 130px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: STONE, fontFamily: 'var(--font-body, sans-serif)', marginBottom: 4 }}>
                      {fact.label}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: fact.color ?? BUSH, fontFamily: 'var(--font-display, sans-serif)' }}>
                      {fact.value}
                    </div>
                  </div>
                ))}
              </div>
            </SectionReveal>
          </div>
        </section>

        {/* ── Overview ──────────────────────────────────────────────────────── */}
        {overview && (
          <section style={{ padding: '72px 24px', background: '#fff' }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <SectionReveal>
                <SectionHeading accent={accent}>{t.overview}</SectionHeading>
                <p style={{
                  fontSize: '1.1rem', lineHeight: 1.8, color: STONE,
                  fontFamily: 'var(--font-body, sans-serif)', whiteSpace: 'pre-line',
                }}>
                  {overview}
                </p>
              </SectionReveal>
            </div>
          </section>
        )}

        {/* ── Route map — generated from the itinerary's own destinations,
            same as the client proposal's tour map (no manual upload). ──── */}
        {mapStops.length >= 2 && (
          <section style={{ padding: '0 24px 72px', background: '#fff' }}>
            <div style={{ maxWidth: 1120, margin: '0 auto' }}>
              <SectionReveal>
                <SectionHeading accent={accent}>{t.routeMap}</SectionHeading>
                <ItineraryMap stops={mapStops} width={1120} height={480} />
              </SectionReveal>
            </div>
          </section>
        )}

        {/* ── Highlights ────────────────────────────────────────────────────── */}
        {highlights.length > 0 && (
          <section style={{ padding: '72px 24px', background: SAND }}>
            <div style={{ maxWidth: 1120, margin: '0 auto' }}>
              <SectionReveal>
                <SectionHeading accent={accent}>{t.highlights}</SectionHeading>
              </SectionReveal>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {highlights.map((h, i) => (
                  <SectionReveal key={i} delay={i * 0.05}>
                    <div style={{
                      background: '#fff', borderRadius: 12, padding: '18px 20px',
                      border: '1px solid #E5E0D8',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                    }}>
                      <span style={{ color: accent, fontSize: 18, flexShrink: 0, marginTop: 1 }}>✦</span>
                      <span style={{ color: BUSH, fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.95rem', lineHeight: 1.5 }}>{h}</span>
                    </div>
                  </SectionReveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Itinerary ─────────────────────────────────────────────────────── */}
        {itineraryDays.length > 0 && (
          <section style={{ padding: '72px 24px', background: '#fff' }}>
            <div style={{ maxWidth: 1120, margin: '0 auto' }}>
              <SectionReveal>
                <SectionHeading accent={accent}>{t.itinerary}</SectionHeading>
              </SectionReveal>
              <ItineraryRouteLine days={itineraryDays} accentColor={accent} isAr={isAr} />
            </div>
          </section>
        )}

        {/* ── Included / Excluded ───────────────────────────────────────────── */}
        {(included.length > 0 || excluded.length > 0) && (
          <section style={{ padding: '72px 24px', background: SAND }}>
            <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 48 }}>
              {included.length > 0 && (
                <SectionReveal>
                  <SectionHeading accent={accent}>{t.included}</SectionHeading>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {included.map((item, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ color: '#166534', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✓</span>
                        <span style={{ color: BUSH, fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.95rem', lineHeight: 1.5 }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </SectionReveal>
              )}
              {excluded.length > 0 && (
                <SectionReveal delay={0.05}>
                  <SectionHeading accent={accent}>{t.excluded}</SectionHeading>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {excluded.map((item, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ color: '#991B1B', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✕</span>
                        <span style={{ color: STONE, fontFamily: 'var(--font-body, sans-serif)', fontSize: '0.95rem', lineHeight: 1.5 }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </SectionReveal>
              )}
            </div>
          </section>
        )}

        {/* ── Gallery ───────────────────────────────────────────────────────── */}
        {gallery.length > 0 && (
          <section style={{ padding: '72px 24px', background: '#fff' }}>
            <div style={{ maxWidth: 1120, margin: '0 auto' }}>
              <SectionReveal>
                <SectionHeading accent={accent}>{t.gallery}</SectionHeading>
              </SectionReveal>
              <GalleryGrid urls={gallery} tourId={departure.tour_id} alt={title ?? ''} isAr={isAr} />
            </div>
          </section>
        )}

        {/* ── FAQs ──────────────────────────────────────────────────────────── */}
        {faqs.length > 0 && (
          <section style={{ padding: '72px 24px', background: SAND }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <SectionReveal>
                <SectionHeading accent={accent}>{t.faqs}</SectionHeading>
              </SectionReveal>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {faqs.map((f, i) => {
                  const q = isAr ? (f.q_ar || f.q_en) : (f.q_en || f.q_ar)
                  const a = isAr ? (f.a_ar || f.a_en) : (f.a_en || f.a_ar)
                  if (!q) return null
                  return (
                    <SectionReveal key={i} delay={i * 0.04}>
                      <details style={{
                        background: '#fff', borderRadius: 12,
                        border: '1px solid #E5E0D8', padding: '16px 20px',
                      }}>
                        <summary style={{
                          fontWeight: 600, color: BUSH, cursor: 'pointer',
                          fontFamily: 'var(--font-body, sans-serif)',
                          fontSize: '0.95rem', lineHeight: 1.5,
                        }}>
                          {q}
                        </summary>
                        {a && (
                          <p style={{
                            color: STONE, marginTop: 12, fontSize: '0.9rem',
                            lineHeight: 1.7, fontFamily: 'var(--font-body, sans-serif)',
                            whiteSpace: 'pre-line',
                          }}>
                            {a}
                          </p>
                        )}
                      </details>
                    </SectionReveal>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Final CTA — book first, enquiry and WhatsApp as fallbacks ──────── */}
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
                {isAvailable && (
                  <Link href={bookHref} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '14px 28px', borderRadius: 8,
                    background: accent, color: '#fff',
                    fontWeight: 700, fontSize: 15, textDecoration: 'none',
                    fontFamily: 'var(--font-body, sans-serif)',
                  }}>
                    {t.bookNow}
                  </Link>
                )}
                <Link href={enquireHref} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', borderRadius: 8,
                  background: OLIVE, color: '#fff',
                  fontWeight: 600, fontSize: 15, textDecoration: 'none',
                  fontFamily: 'var(--font-body, sans-serif)',
                }}>
                  {t.enquireForm}
                </Link>
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
      </main>

      <PublicFooter />
      <WhatsAppButton lang={locale} />
    </div>
  )
}

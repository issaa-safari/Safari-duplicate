import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import WhatsAppButton from '@/components/public/whatsapp-button'
import SafariImage from '@/components/public/safari-image'
import TourHero from '@/components/public/tour-hero'
import ItineraryRouteLine from '@/components/public/itinerary-route-line'
import type { ItineraryDay } from '@/components/public/itinerary-route-line'
import DepartureCards from '@/components/public/departure-cards'
import type { DepartureCardData } from '@/components/public/departure-cards'
import GalleryGrid from '@/components/public/gallery-grid'
import TrustStrip from '@/components/public/trust-strip'
import type { StaffMember } from '@/components/public/trust-strip'
import TourEnquiryForm from '@/components/public/tour-enquiry-form'
import Testimonials from '@/components/public/testimonials'
import SectionReveal from '@/components/public/section-reveal'
import StickyEnquiryBar from '@/components/public/sticky-enquiry-bar'
import { getServerLocale } from '@/lib/i18n'
import { whatsappLink } from '@/lib/site'

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
  params: Promise<{ id: string }>
  searchParams: Promise<{ lang?: string }>
}): Promise<Metadata> {
  const { id } = await params
  const sp = await searchParams
  const locale = await getServerLocale(sp)
  const supabase = await createClient()
  const { data: tour } = await supabase
    .from('tours')
    .select('title_en, title_ar, overview_en, hero_image_url')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()
  if (!tour) return {}
  const title = locale === 'ar' ? (tour.title_ar || tour.title_en) : tour.title_en
  return {
    title: title ?? undefined,
    description: tour.overview_en?.slice(0, 160) ?? undefined,
    openGraph: { images: tour.hero_image_url ? [tour.hero_image_url] : [] },
  }
}

export default async function TourDetailPage({
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
  const supabase = await createClient()

  // ── Tour ─────────────────────────────────────────────────────────────────
  const { data: tour } = await supabase
    .from('tours')
    .select(`
      id, title_en, title_ar, subtitle_en, subtitle_ar,
      overview_en, overview_ar, type,
      duration_days, duration_nights, countries_visited,
      start_destination, end_destination,
      hero_image_url, gallery_urls, route_map_url,
      highlights_en, highlights_ar,
      included_en, included_ar, excluded_en, excluded_ar,
      terrain, vehicle, accommodation_level,
      total_distance_km, difficulty_rating, max_group_size,
      faqs, status
    `)
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()

  if (!tour) notFound()

  const accent = accentFor(tour.type)
  const title = isAr ? (tour.title_ar || tour.title_en) : tour.title_en
  const subtitle = isAr ? (tour.subtitle_ar || tour.subtitle_en) : tour.subtitle_en
  const overview = isAr ? (tour.overview_ar || tour.overview_en) : tour.overview_en
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

  // Route text e.g. "Nairobi → Masai Mara → Nairobi" (arrow mirrors for RTL)
  const routeArrow = isAr ? ' ← ' : ' → '
  const routeText = tour.start_destination
    ? `${tour.start_destination}${tour.end_destination ? `${routeArrow}${tour.end_destination}` : ''}`
    : null

  // ── Tour days ─────────────────────────────────────────────────────────────
  const { data: rawDays } = await supabase
    .from('tour_days')
    .select('id, day_number, day_number_end, title_en, title_ar, destination_id, accommodation_id, meal_breakfast, meal_lunch, meal_dinner, distance_km, image_url, activities')
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
    destIds.length ? supabase.from('destinations').select('id, description_en, description_ar').in('id', destIds) : { data: [] },
    accomIds.length ? supabase.from('accommodations').select('id, name').in('id', accomIds) : { data: [] },
    activityIds.length ? supabase.from('activities').select('id, name, description_en, description_ar').in('id', activityIds) : { data: [] },
  ])

  const destMap: Record<string, { en: string | null; ar: string | null }> = {}
  for (const d of destRes.data ?? []) destMap[d.id] = { en: d.description_en, ar: d.description_ar }

  const accomMap: Record<string, string> = {}
  for (const a of accomRes.data ?? []) accomMap[a.id] = a.name

  const actMap: Record<string, { name: string; en: string | null; ar: string | null }> = {}
  for (const a of actRes.data ?? []) actMap[a.id] = { name: a.name, en: a.description_en, ar: a.description_ar }

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
      distanceKm: d.distance_km ?? null,
      mealBreakfast: d.meal_breakfast ?? false,
      mealLunch: d.meal_lunch ?? false,
      mealDinner: d.meal_dinner ?? false,
      accommodation: d.accommodation_id ? (accomMap[d.accommodation_id] ?? null) : null,
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
    .select('id, start_date, end_date, max_seats, booked_seats, price_usd, status')
    .eq('tour_id', id)
    .eq('is_active', true)
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
    status: d.status,
  }))

  // Lowest price for hero
  const lowestPrice = departures.reduce<number | null>((min, d) => {
    if (d.priceUsd == null) return min
    return min == null || d.priceUsd < min ? d.priceUsd : min
  }, null)

  const hasAvailable = departures.some(d => d.maxSeats - d.bookedSeats > 0 && d.status !== 'cancelled')

  // ── Staff ─────────────────────────────────────────────────────────────────
  const { data: rawStaff } = await supabase
    .from('tour_staff')
    .select('id, name, role')
    .eq('is_active', true)
    .limit(8)

  const staff: StaffMember[] = (rawStaff ?? []).map(s => ({ id: s.id, name: s.name, role: s.role }))

  const enquireHref = `/quote-request?tour=${id}&lang=${locale}`
  const bookHref = departures[0]
    ? `/departures/${departures[0].id}/book?lang=${locale}&price=${departures[0].priceUsd}&tour=${encodeURIComponent(title ?? '')}`
    : enquireHref
  const waHref = whatsappLink(isAr ? `مرحباً، أريد الاستفسار عن جولة: ${title}` : `Hi, I'd like to enquire about: ${title}`)

  const t = isAr ? {
    overview: 'نظرة عامة', highlights: 'أبرز ما في الرحلة',
    itinerary: 'البرنامج اليومي', included: 'ما يشمله السعر',
    excluded: 'ما لا يشمله السعر', gallery: 'معرض الصور',
    departures: 'المواعيد المتاحة', trust: 'لماذا نحن؟',
    reviews: 'آراء المسافرين', enquiry: 'تواصل معنا',
    routeMap: 'خريطة المسار', faqs: 'الأسئلة الشائعة',
  } : {
    overview: 'Tour Overview', highlights: 'Tour Highlights',
    itinerary: 'Day-by-Day Itinerary', included: "What's Included",
    excluded: "What's Excluded", gallery: 'Photo Gallery',
    departures: 'Dates & Availability', trust: 'Why Us',
    reviews: 'Traveller Reviews', enquiry: 'Send an Enquiry',
    routeMap: 'Route Map', faqs: 'FAQs',
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} style={{ background: '#fff' }}>
      <Suspense><PublicHeader /></Suspense>

      {/* 1. Hero */}
      <TourHero
        tourTitle={title ?? ''}
        subtitle={subtitle}
        routeText={routeText}
        durationDays={tour.duration_days}
        distanceKm={tour.total_distance_km}
        groupSize={tour.max_group_size}
        terrain={tour.terrain}
        accentColor={accent}
        price={lowestPrice}
        isAvailable={hasAvailable}
        bookHref={bookHref}
        enquireHref={enquireHref}
        isAr={isAr}
        tripLabel={tripLabel(tour.type, isAr)}
        imageSlot={
          <SafariImage
            src={tour.hero_image_url}
            seed={id}
            alt={title ?? ''}
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
      />

      {/* 3. Overview + quick facts */}
      {(overview || tour.difficulty_rating || tour.vehicle || tour.accommodation_level) && (
        <section style={{ padding: '72px 24px', background: '#fff' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr auto', gap: 48, alignItems: 'start' }}>
            <SectionReveal>
              <SectionHeading accent={accent}>{t.overview}</SectionHeading>
              {overview && (
                <p style={{
                  fontSize: '1.05rem', lineHeight: 1.8, color: '#3D3D35',
                  fontFamily: isAr ? 'var(--font-body-ar, var(--font-body, sans-serif))' : 'var(--font-body, sans-serif)',
                  whiteSpace: 'pre-line', maxWidth: 680,
                }}>
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
                  tour.total_distance_km && { label: isAr ? 'المسافة الكلية' : 'Total Distance', value: `${tour.total_distance_km.toLocaleString()} km` },
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

      {/* 4. Route map */}
      {tour.route_map_url && (
        <section style={{ padding: '0 24px 72px', background: '#fff' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <SectionReveal>
              <SectionHeading accent={accent}>{t.routeMap}</SectionHeading>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tour.route_map_url} alt={t.routeMap} style={{ width: '100%', borderRadius: 12, border: '1px solid #E5E0D8' }} />
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

      {/* 6. Included / Excluded */}
      {(included.length > 0 || excluded.length > 0) && (
        <section style={{ padding: '72px 24px', background: SAND }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
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
            <GalleryGrid urls={gallery} tourId={id} alt={title ?? ''} />
          </div>
        </section>
      )}

      {/* 8. Departures */}
      <section style={{ padding: '72px 24px', background: BUSH, color: '#fff' }}>
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
          />
        </div>
      </section>

      {/* 9. Trust strip */}
      <section style={{ padding: '72px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionReveal>
            <SectionHeading accent={accent}>{t.trust}</SectionHeading>
          </SectionReveal>
          <TrustStrip staff={staff} isAr={isAr} accentColor={accent} />
        </div>
      </section>

      {/* 10. Reviews */}
      <Testimonials lang={locale} />

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

      {/* 11. Final enquiry form */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <SectionReveal>
            <SectionHeading accent={accent}>{t.enquiry}</SectionHeading>
            <p style={{ color: STONE, marginBottom: 32, fontFamily: 'var(--font-body, sans-serif)', fontSize: '1rem' }}>
              {isAr
                ? 'أخبرنا عن رحلة أحلامك وسنبدأ في إعداد عرض مخصص لك.'
                : "Tell us about your dream trip and we’ll start building a personalised proposal."}
            </p>
          </SectionReveal>
          <SectionReveal delay={0.1}>
            <TourEnquiryForm
              tourId={id}
              tourTitleEn={tour.title_en ?? ''}
              accentColor={accent}
              isAr={isAr}
              locale={locale}
            />
          </SectionReveal>
        </div>
      </section>

      <PublicFooter />
      <WhatsAppButton lang={locale} />
    </div>
  )
}

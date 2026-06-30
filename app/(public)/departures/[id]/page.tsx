import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import WhatsAppButton from '@/components/public/whatsapp-button'
import SafariImage from '@/components/public/safari-image'
import ItineraryRouteLine from '@/components/public/itinerary-route-line'
import type { ItineraryDay } from '@/components/public/itinerary-route-line'
import GalleryGrid from '@/components/public/gallery-grid'
import TourEnquiryForm from '@/components/public/tour-enquiry-form'
import SectionReveal from '@/components/public/section-reveal'
import { getServerLocale } from '@/lib/i18n'
import { whatsappLink } from '@/lib/site'

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
    return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })
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
    .select('start_date, end_date, tours(title_en, title_ar, hero_image_url)')
    .eq('id', id)
    .maybeSingle()
  if (!dep) return {}
  const tour = dep.tours as any
  const title = locale === 'ar' ? (tour?.title_ar || tour?.title_en) : tour?.title_en
  return {
    title: title ? `${title} — ${formatDate(dep.start_date, locale)}` : undefined,
    openGraph: { images: tour?.hero_image_url ? [tour.hero_image_url] : [] },
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
      max_seats, booked_seats, price_usd, status, is_active,
      tours (
        id, title_en, title_ar, subtitle_en, subtitle_ar,
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
    .select('id, day_number, day_number_end, title_en, title_ar, destination_id, accommodation_id, meal_breakfast, meal_lunch, meal_dinner, distance_km, image_url, activities')
    .eq('tour_id', departure.tour_id)
    .order('day_number')

  const tourDays = rawDays ?? []

  // Resolve destination descriptions
  const destIds = [...new Set(tourDays.map(d => d.destination_id).filter(Boolean))] as string[]
  const destMap: Record<string, { en: string | null; ar: string | null }> = {}
  if (destIds.length > 0) {
    const { data: dests } = await supabase.from('destinations').select('id, description_en, description_ar').in('id', destIds)
    for (const d of dests ?? []) destMap[d.id] = { en: d.description_en, ar: d.description_ar }
  }

  // Resolve accommodation names
  const accomIds = [...new Set(tourDays.map(d => d.accommodation_id).filter(Boolean))] as string[]
  const accomMap: Record<string, string> = {}
  if (accomIds.length > 0) {
    const { data: accoms } = await supabase.from('accommodations').select('id, name').in('id', accomIds)
    for (const a of accoms ?? []) accomMap[a.id] = a.name
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
      distanceKm: d.distance_km ?? null,
      accommodation: d.accommodation_id ? accomMap[d.accommodation_id] ?? null : null,
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

  const bookHref = `/departures/${id}/book?lang=${locale}&price=${departure.price_usd}&tour=${encodeURIComponent(title ?? '')}`
  const waHref = whatsappLink(`Hi, I'm interested in the ${title} departure on ${formatDate(departure.start_date, 'en')}`)

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
    highlights: 'أبرز ما في الرحلة',
    itinerary: 'برنامج الرحلة',
    included: 'ما يشمله السعر',
    excluded: 'ما لا يشمله السعر',
    gallery: 'معرض الصور',
    faqs: 'الأسئلة الشائعة',
    enquireForm: 'أرسل استفساراً',
    fullyBooked: 'مكتمل الحجز',
    available: 'متاح',
    guaranteed: 'مضمون',
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
    highlights: 'Tour Highlights',
    itinerary: 'Day-by-Day Itinerary',
    included: "What's Included",
    excluded: "What's Excluded",
    gallery: 'Photo Gallery',
    faqs: 'Frequently Asked Questions',
    enquireForm: 'Send an Enquiry',
    fullyBooked: 'Fully Booked',
    available: 'Available',
    guaranteed: 'Guaranteed',
  }

  const statusLabel = departure.status === 'guaranteed' ? t.guaranteed
    : departure.status === 'available' ? t.available
    : t.fullyBooked

  const statusColor = departure.status === 'guaranteed' ? '#166534'
    : departure.status === 'available' ? OLIVE
    : '#991B1B'

  return (
    <div dir={dir}>
      <Suspense>
        <PublicHeader />
      </Suspense>

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section style={{
          position: 'relative',
          minHeight: 520,
          background: BUSH,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          overflow: 'hidden',
        }}>
          {/* Background image */}
          {tour?.hero_image_url && (
            <div style={{ position: 'absolute', inset: 0 }}>
              <SafariImage
                src={tour.hero_image_url}
                seed={departure.tour_id}
                alt={title ?? ''}
                className="w-full h-full"
                sizes="100vw"
                priority
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(32,39,26,0.92) 0%, rgba(32,39,26,0.4) 60%, rgba(32,39,26,0.1) 100%)',
              }} />
            </div>
          )}

          <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '0 24px 56px', width: '100%' }}>
            {/* Back link */}
            <Link href={`/tours/${departure.tour_id}?lang=${locale}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem',
              textDecoration: 'none', marginBottom: 32,
              fontFamily: 'var(--font-body, sans-serif)',
            }}>
              {isAr ? '→' : '←'} {t.backToTour}
            </Link>

            {/* Departure badge */}
            <div style={{ marginBottom: 16 }}>
              <span style={{
                background: accent, color: '#fff',
                fontSize: '0.72rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '5px 14px', borderRadius: 99,
                fontFamily: 'var(--font-body, sans-serif)',
              }}>
                {t.departure}
              </span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display, "Readex Pro", sans-serif)',
              fontSize: 'clamp(1.8rem, 5vw, 3rem)',
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 8px',
              lineHeight: 1.2,
            }}>
              {title}
            </h1>

            <p style={{
              color: 'rgba(255,255,255,0.75)',
              fontFamily: 'var(--font-body, sans-serif)',
              fontSize: '1.1rem',
              margin: '0 0 32px',
            }}>
              {formatDate(departure.start_date, locale)} → {formatDate(departure.end_date, locale)}
              {daysCount > 0 && ` · ${daysCount} ${t.days}`}
            </p>

            {/* Price + CTA row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display, sans-serif)',
                  fontSize: 'clamp(2rem, 5vw, 2.6rem)',
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1,
                }}>
                  ${departure.price_usd?.toLocaleString()}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontFamily: 'var(--font-body, sans-serif)' }}>
                  {t.perPerson}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {isAvailable && (
                  <Link href={bookHref} style={{
                    background: accent, color: '#fff',
                    padding: '13px 28px', borderRadius: 8,
                    fontWeight: 700, fontSize: '1rem',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-body, sans-serif)',
                  }}>
                    {t.bookNow}
                  </Link>
                )}
                <Link href={waHref} target="_blank" rel="noopener noreferrer" style={{
                  background: '#25D366', color: '#fff',
                  padding: '13px 28px', borderRadius: 8,
                  fontWeight: 700, fontSize: '1rem',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-body, sans-serif)',
                }}>
                  {t.whatsapp}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Quick facts bar ───────────────────────────────────────────────── */}
        <section style={{ background: SAND, borderBottom: `3px solid ${accent}` }}>
          <div style={{
            maxWidth: 1120, margin: '0 auto', padding: '0 24px',
            display: 'flex', flexWrap: 'wrap', gap: 0,
          }}>
            {[
              { label: t.startDate, value: formatDate(departure.start_date, locale) },
              { label: t.endDate, value: formatDate(departure.end_date, locale) },
              { label: t.duration, value: `${daysCount} ${t.days}` },
              { label: t.spots, value: `${availableSpots} / ${departure.max_seats}` },
              { label: t.status, value: statusLabel, color: statusColor },
              ...(tour?.terrain ? [{ label: t.terrain, value: tour.terrain }] : []),
              ...(tour?.difficulty_rating ? [{ label: t.difficulty, value: `${tour.difficulty_rating}/10` }] : []),
              ...(tour?.max_group_size ? [{ label: t.groupSize, value: `Max ${tour.max_group_size}` }] : []),
            ].map((fact, i) => (
              <div key={i} style={{
                padding: '20px 24px',
                borderRight: `1px solid rgba(110,106,89,0.2)`,
                minWidth: 120,
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: STONE, fontFamily: 'var(--font-body, sans-serif)', marginBottom: 4 }}>
                  {fact.label}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: (fact as any).color ?? BUSH, fontFamily: 'var(--font-body, sans-serif)' }}>
                  {fact.value}
                </div>
              </div>
            ))}
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
              <ItineraryRouteLine days={itineraryDays} accentColor={accent} isAr={isAr} locale={locale} />
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
              <GalleryGrid urls={gallery} tourId={departure.tour_id} alt={title ?? ''} />
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

        {/* ── Enquiry form ──────────────────────────────────────────────────── */}
        <section style={{ padding: '72px 24px', background: '#fff' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <SectionReveal>
              <SectionHeading accent={accent}>{t.enquireForm}</SectionHeading>
              <TourEnquiryForm
                tourId={departure.tour_id}
                tourTitleEn={tour?.title_en ?? ''}
                accentColor={accent}
                isAr={isAr}
                locale={locale}
                departureId={id}
              />
            </SectionReveal>
          </div>
        </section>
      </main>

      <PublicFooter />
      <WhatsAppButton lang={locale} />
    </div>
  )
}

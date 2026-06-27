import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'

const G = '#7A9A4A'

export const dynamic = 'force-dynamic'

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

function mealsLabel(day: any, locale: string) {
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

function dayLabel(day: any, locale: string) {
  const base = locale === 'ar' ? 'اليوم' : 'Day'
  if (day.day_number_end && day.day_number_end !== day.day_number) {
    return `${base} ${day.day_number}–${day.day_number_end}`
  }
  return `${base} ${day.day_number}`
}

export default async function DepartureDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { id } = await params
  const { lang } = await searchParams
  const locale = (lang as 'en' | 'ar') || 'en'
  const isAr = locale === 'ar'

  const admin = createAdminClient()

  // Get departure details
  const { data: departure } = await admin
    .from('departures')
    .select(`
      id,
      tour_id,
      start_date,
      end_date,
      max_seats,
      booked_seats,
      price_usd,
      status,
      is_active,
      tours (
        id,
        title_en,
        title_ar,
        description_en,
        description_ar,
        type,
        countries_visited,
        start_destination,
        end_destination
      )
    `)
    .eq('id', id)
    .single()

  if (!departure) notFound()

  // Get tour days for itinerary (real schema columns)
  const { data: tourDays } = await admin
    .from('tour_days')
    .select('id, day_number, day_number_end, title_en, title_ar, description_en, accommodation_id, meal_breakfast, meal_lunch, meal_dinner, distance_km')
    .eq('tour_id', departure.tour_id)
    .order('day_number')

  // Resolve accommodation names for the days that have them
  const accomIds = [...new Set((tourDays ?? []).map((d: any) => d.accommodation_id).filter(Boolean))]
  const accomMap: Record<string, string> = {}
  if (accomIds.length > 0) {
    const { data: accoms } = await admin.from('accommodations').select('id, name').in('id', accomIds)
    for (const a of accoms ?? []) accomMap[a.id] = a.name
  }

  const tour = departure.tours as any
  const daysCount = getDaysCount(departure.start_date, departure.end_date)
  const availableSpots = departure.max_seats - departure.booked_seats
  const isAvailable = availableSpots > 0 && departure.status === 'available'
  const title = isAr ? (tour?.title_ar || tour?.title_en) : tour?.title_en
  const description = isAr ? (tour?.description_ar || tour?.description_en) : tour?.description_en

  const t = isAr ? {
    bookNow: 'احجز الآن',
    askQuestion: 'اسأل سؤالاً',
    tourOverview: 'نظرة عامة على الرحلة',
    tourSnapshot: 'لمحة سريعة',
    itinerary: 'برنامج الرحلة يوماً بيوم',
    keyInfo: 'الحالة',
    price: 'السعر',
    availableSpots: 'المقاعد المتاحة',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    duration: 'المدة',
    days: 'أيام',
    meals: 'الوجبات',
    accommodation: 'الإقامة',
    distance: 'المسافة',
    fullyBooked: 'مكتمل الحجز',
    perPerson: 'للفرد',
    startingFrom: 'يبدأ من',
    route: 'المسار',
    readyToBook: 'هل أنت مستعد للحجز؟',
    secureSpot: 'احجز مكانك في هذه المغامرة الرائعة!',
    fullMessage: 'هذه الرحلة مكتملة حالياً، لكن تحقق قريباً من تواريخ جديدة!',
    noItinerary: 'لا تتوفر تفاصيل البرنامج لهذه الرحلة بعد.',
    guidedSupported: 'رحلة مصحوبة بمرشد',
  } : {
    bookNow: 'Book Now',
    askQuestion: 'Ask a Question',
    tourOverview: 'Tour Overview',
    tourSnapshot: 'Tour Snapshot',
    itinerary: 'Day-by-Day Itinerary',
    keyInfo: 'Status',
    price: 'Price',
    availableSpots: 'Available Spots',
    startDate: 'Start Date',
    endDate: 'End Date',
    duration: 'Duration',
    days: 'days',
    meals: 'Meals',
    accommodation: 'Accommodation',
    distance: 'Distance',
    fullyBooked: 'Fully Booked',
    perPerson: 'per person',
    startingFrom: 'Starting from',
    route: 'Route',
    readyToBook: 'Ready to Book?',
    secureSpot: 'Secure your spot on this amazing adventure!',
    fullMessage: 'This departure is currently full, but check back soon for new dates!',
    noItinerary: 'No itinerary details available for this tour yet.',
    guidedSupported: 'Guided & Supported',
  }

  const bookHref = `/departures/${id}/book?lang=${locale}`

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <Suspense>
        <PublicHeader />
      </Suspense>

      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-gray-900 to-gray-800 text-white py-8 md:py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="bg-gradient-to-b from-gray-700 to-gray-800 rounded-xl h-72 md:h-[420px] flex items-center justify-center text-8xl mb-8 overflow-hidden">
              🦁
            </div>

            <div>
              <div className="inline-block bg-orange-500 text-white px-4 py-1.5 rounded font-bold text-xs uppercase tracking-wide mb-4">
                {t.guidedSupported}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold mb-3">{title}</h1>
              <p className="text-lg text-gray-300 mb-6">
                {daysCount}-{isAr ? 'يوم' : 'day'} {isAr ? 'مغامرة سفاري' : 'safari adventure'}
                {tour?.start_destination ? ` · ${tour.start_destination}${tour?.end_destination ? ` → ${tour.end_destination}` : ''}` : ''}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Link
                  href={isAvailable ? bookHref : '#'}
                  className={`px-8 py-3 rounded-lg font-bold text-lg text-center transition ${
                    isAvailable ? 'text-white hover:opacity-90' : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                  style={{ backgroundColor: isAvailable ? G : undefined }}
                >
                  📅 {isAvailable ? t.bookNow : t.fullyBooked}
                </Link>
                <Link
                  href={`/contact?lang=${locale}`}
                  className="px-8 py-3 rounded-lg font-bold border-2 border-white text-white hover:bg-white hover:text-gray-900 transition text-center"
                >
                  💬 {t.askQuestion}
                </Link>
              </div>

              <div>
                <span className="text-gray-300 text-sm">{t.startingFrom}</span>
                <div className="text-4xl font-bold" style={{ color: '#A8C97A' }}>
                  ${departure.price_usd?.toLocaleString()}
                  <span className="text-lg text-gray-300 ml-2">{t.perPerson}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tour Snapshot */}
        <section className="bg-gray-50 py-10 md:py-14 border-b-4" style={{ borderColor: G }}>
          <div className="max-w-6xl mx-auto px-4">
            <div className="bg-orange-50 border-l-4 border-orange-500 px-6 py-4 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 uppercase">{t.tourSnapshot}</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <SnapshotCard label={`📅 ${t.startDate}`} value={formatDate(departure.start_date, locale)} />
              <SnapshotCard label={`🏁 ${t.endDate}`} value={formatDate(departure.end_date, locale)} />
              <SnapshotCard label={`⏱️ ${t.duration}`} value={`${daysCount} ${t.days}`} />
              <SnapshotCard label={`💺 ${t.availableSpots}`} value={`${availableSpots}/${departure.max_seats}`} />
              <SnapshotCard label={`💰 ${t.price}`} value={`$${departure.price_usd?.toLocaleString()}`} highlight />
              <SnapshotCard label={`📍 ${t.keyInfo}`} value={departure.status} />
            </div>
          </div>
        </section>

        {/* Tour Overview */}
        {description && (
          <section className="py-10 md:py-14 bg-white">
            <div className="max-w-6xl mx-auto px-4">
              <div className="bg-orange-50 border-l-4 border-orange-500 px-6 py-4 mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{t.tourOverview}</h2>
              </div>
              <p className="text-lg leading-relaxed text-gray-700 max-w-3xl">{description}</p>
            </div>
          </section>
        )}

        {/* Itinerary */}
        <section className="py-10 md:py-14 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="bg-orange-50 border-l-4 border-orange-500 px-6 py-4 mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{t.itinerary}</h2>
            </div>

            <div className="space-y-6">
              {tourDays && tourDays.length > 0 ? (
                tourDays.map((day: any) => {
                  const dayTitle = isAr ? (day.title_ar || day.title_en) : day.title_en
                  const accomName = day.accommodation_id ? accomMap[day.accommodation_id] : null
                  return (
                    <div key={day.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 flex-shrink-0">
                            <span className="text-lg font-bold">{day.day_number}</span>
                          </div>
                          <div>
                            <p className="text-orange-100 text-xs uppercase tracking-wide">{dayLabel(day, locale)}</p>
                            <h3 className="text-xl font-bold">{dayTitle}</h3>
                          </div>
                        </div>
                      </div>

                      <div className="px-6 py-6">
                        {day.description_en && (
                          <p className="text-gray-700 leading-relaxed mb-5">
                            {isAr ? (day.description_ar || day.description_en) : day.description_en}
                          </p>
                        )}

                        <div className="grid sm:grid-cols-3 gap-4 text-sm border-t border-gray-100 pt-4">
                          <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">🍽️ {t.meals}</p>
                            <p className="text-gray-700">{mealsLabel(day, locale)}</p>
                          </div>
                          {accomName && (
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">🏨 {t.accommodation}</p>
                              <p className="text-gray-700">{accomName}</p>
                            </div>
                          )}
                          {day.distance_km && (
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">📏 {t.distance}</p>
                              <p className="text-gray-700">{day.distance_km} km</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
                  <p className="text-gray-600 text-lg">{t.noItinerary}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 md:py-16" style={{ backgroundColor: G }}>
          <div className="max-w-4xl mx-auto px-4 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">{t.readyToBook}</h2>
            <p className="text-lg mb-8 opacity-90">{isAvailable ? t.secureSpot : t.fullMessage}</p>
            {isAvailable && (
              <Link
                href={bookHref}
                className="px-8 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition inline-block"
              >
                {t.bookNow}
              </Link>
            )}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

function SnapshotCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <p className="text-xs text-gray-600 font-bold uppercase mb-2">{label}</p>
      <p className="text-sm font-bold capitalize" style={highlight ? { color: G } : { color: '#111827' }}>{value}</p>
    </div>
  )
}

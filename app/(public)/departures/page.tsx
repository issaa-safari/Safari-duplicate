import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'

const G = '#7A9A4A'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // Revalidate every 60 seconds for fresh data

interface Departure {
  id: string
  tour_id: string
  start_date: string
  end_date: string
  max_seats: number
  booked_seats: number
  price_usd: number
  status: string
  tour?: { title_en: string; title_ar: string; description_en: string; destination_id: string }
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

export default async function DeparturesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const params = await searchParams
  const locale = (params.lang as 'en' | 'ar') || 'en'

  const admin = createAdminClient()

  const { data: departures } = await admin
    .from('departures')
    .select(
      `id, tour_id, start_date, end_date, max_seats, booked_seats, price_usd, status,
       tour:tours(title_en, title_ar, description_en, destination_id)`
    )
    .eq('is_active', true)
    .gte('start_date', new Date().toISOString().split('T')[0])
    .order('start_date')

  const t = locale === 'ar' ? {
    departures: 'الرحلات القادمة',
    bookNow: 'احجز الآن',
    availableSpots: 'المقاعد المتاحة',
    price: 'السعر للفرد',
    days: 'يوم',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    fullyBooked: 'مكتمل',
    noDepartures: 'لا توجد رحلات متاحة حالياً',
  } : {
    departures: 'Upcoming Departures',
    bookNow: 'Book Now',
    availableSpots: 'Available Spots',
    price: 'Price per Person',
    days: 'days',
    startDate: 'Start Date',
    endDate: 'End Date',
    fullyBooked: 'Fully Booked',
    noDepartures: 'No departures available at this time',
  }

  return (
    <>
      <PublicHeader />
      <main>
        {/* Page Header */}
        <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.departures}</h1>
              <p className="text-lg text-gray-300">
                {locale === 'ar'
                  ? 'اختر من بين رحلاتنا المتاحة واحجز مكانك اليوم'
                  : 'Choose from our available tours and book your spot today'}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/departures?lang=en`}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  locale === 'en'
                    ? 'bg-white text-gray-900'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                EN
              </Link>
              <Link
                href={`/departures?lang=ar`}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  locale === 'ar'
                    ? 'bg-white text-gray-900'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                العربية
              </Link>
            </div>
          </div>
        </section>

        {/* Departures Grid */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            {departures && departures.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(departures as any[]).map((dep: Departure) => {
                  const tour = dep.tour as any
                  const daysCount = getDaysCount(dep.start_date, dep.end_date)
                  const availableSpots = dep.max_seats - dep.booked_seats
                  const isAvailable = availableSpots > 0
                  const title = locale === 'ar' ? tour?.title_ar : tour?.title_en
                  const desc = locale === 'ar' ? '...' : tour?.description_en

                  return (
                    <div
                      key={dep.id}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition flex flex-col"
                    >
                      {/* Tour Image Placeholder */}
                      <div
                        className="w-full h-48 flex items-center justify-center text-6xl text-white"
                        style={{ backgroundColor: G }}
                      >
                        🦁
                      </div>

                      {/* Departure Info */}
                      <div className="p-6 flex flex-col flex-grow">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>

                        {/* Dates */}
                        <div className="mb-4 text-sm text-gray-600 space-y-1">
                          <div>
                            <span className="font-semibold">{t.startDate}:</span> {formatDate(dep.start_date, locale)}
                          </div>
                          <div>
                            <span className="font-semibold">{t.endDate}:</span> {formatDate(dep.end_date, locale)}
                          </div>
                          <div>
                            <span className="font-semibold">{daysCount}</span> {t.days}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: `${G}15` }}>
                          <div className="text-sm text-gray-600">{t.price}</div>
                          <div className="text-2xl font-bold" style={{ color: G }}>
                            ${dep.price_usd?.toLocaleString() || '—'}
                          </div>
                        </div>

                        {/* Availability */}
                        <div className="mb-6 p-3 rounded-lg bg-gray-50 border border-gray-200">
                          <div className="text-sm text-gray-600">{t.availableSpots}</div>
                          <div className="text-lg font-bold text-gray-900">
                            {isAvailable ? (
                              <span>{availableSpots} / {dep.max_seats}</span>
                            ) : (
                              <span className="text-red-600">{t.fullyBooked}</span>
                            )}
                          </div>
                          {isAvailable && (
                            <div className="mt-2 w-full bg-gray-300 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition"
                                style={{
                                  width: `${(dep.booked_seats / dep.max_seats) * 100}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Book Button */}
                        <Link
                          href={isAvailable ? `/departures/${dep.id}/book?lang=${locale}&tour=${encodeURIComponent(title)}&price=${dep.price_usd}` : '#'}
                          className={`block text-center px-4 py-3 rounded-lg font-semibold transition ${
                            isAvailable
                              ? 'text-white hover:opacity-90'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                          style={{ backgroundColor: isAvailable ? G : undefined }}
                        >
                          {isAvailable ? t.bookNow : t.fullyBooked}
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">{t.noDepartures}</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

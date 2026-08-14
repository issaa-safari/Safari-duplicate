import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Check, Hourglass, Settings, Lock } from 'lucide-react'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import { getServerLocale } from '@/lib/i18n'
import { localePath } from '@/lib/locale'
import { bookingTiming, resolveTripDates } from '@/lib/trip-dates'

const G = '#7A9A4A'
const DISPLAY = 'var(--font-display, "Readex Pro", sans-serif)'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const sp = await searchParams
  const locale = await getServerLocale(sp)
  const isAr = locale === 'ar'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Stay in the language the visitor was reading when they hit the login wall.
  if (!user) redirect(localePath('/login', locale))

  const t = isAr ? {
    myDashboard: 'لوحة التحكم', welcome: 'مرحباً بعودتك! أدر حجوزاتك وحسابك',
    settings: 'الإعدادات', security: 'الأمان',
    upcoming: 'الحجوزات القادمة', completed: 'الجولات المكتملة', waitlisted: 'قائمة الانتظار',
    tour: 'الجولة', startDate: 'تاريخ البداية', endDate: 'تاريخ النهاية', travellers: 'المسافرون',
    price: 'السعر', status: 'الحالة', viewDetails: 'عرض التفاصيل', view: 'عرض', pricePaid: 'المبلغ المدفوع',
    noBookings: 'لا توجد حجوزات بعد', readyNext: 'هل أنت مستعد لمغامرة السفاري القادمة؟',
    browse: 'تصفح الرحلات المتاحة',
    privateTrip: 'رحلة خاصة', datesTbc: 'لم تُحدَّد بعد',
  } : {
    myDashboard: 'My Dashboard', welcome: 'Welcome back! Manage your bookings and account',
    settings: 'Settings', security: 'Security',
    upcoming: 'Upcoming Bookings', completed: 'Completed Tours', waitlisted: 'Waitlisted Bookings',
    tour: 'Tour', startDate: 'Start Date', endDate: 'End Date', travellers: 'Travellers',
    price: 'Price', status: 'Status', viewDetails: 'View Details', view: 'View', pricePaid: 'Price Paid',
    noBookings: 'No bookings yet', readyNext: 'Ready for your next safari adventure?',
    browse: 'Browse Available Departures',
    privateTrip: 'Private trip', datesTbc: 'To be confirmed',
  }

  const admin = createAdminClient()

  // Bookings are linked to the signed-in user by matching the traveller email
  // captured at booking time against the account email (works for Google and
  // email/password logins alike, with no schema change required).
  const userEmail = (user.email ?? '').toLowerCase()

  const { data: matchedTravellers } = await admin
    .from('booking_travellers')
    .select('booking_id')
    .ilike('email', userEmail)

  const bookingIds = [...new Set((matchedTravellers ?? []).map((t: any) => t.booking_id).filter(Boolean))]

  const { data: bookings } = bookingIds.length > 0
    ? await admin
        .from('bookings')
        .select(`
          id,
          status,
          number_of_travellers,
          total_price_usd,
          created_at,
          start_date,
          end_date,
          departures (
            id,
            start_date,
            end_date,
            tours (
              id,
              title_en,
              title_ar
            )
          )
        `)
        .in('id', bookingIds)
        .order('created_at', { ascending: false })
    : { data: [] as any[] }

  // Dates come from the departure, or from the booking's own columns for a
  // private trip (lib/trip-dates.ts). This used to read
  // `new Date(departure?.end_date) > new Date()`, and every comparison against
  // an Invalid Date is false — so a booking with no departure fell out of both
  // lists and vanished from the client's account. 'undated' is now its own
  // answer, and those bookings sit with the upcoming ones, which is where a
  // trip that has not happened yet belongs.
  const upcomingBookings = bookings?.filter(b => {
    if (b.status === 'cancelled') return false
    const timing = bookingTiming(b as any)
    return timing === 'upcoming' || timing === 'undated'
  }) ?? []

  const completedBookings = bookings?.filter(b => bookingTiming(b as any) === 'past') ?? []

  const waitlistedBookings = bookings?.filter(b => b.status === 'pending') ?? []

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <PublicHeader initialLang={locale} />
      <main className="min-h-screen bg-[#F5F0E8] py-12">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#20271A] mb-2" style={{ fontFamily: DISPLAY }}>{t.myDashboard}</h1>
            <p className="text-[#6E6A59]">{t.welcome}</p>
          </div>

          {/* User Info Card */}
          <div className="bg-white rounded-lg border border-[#E5E0D8] p-6 mb-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 break-words">
                <h2 className="text-xl font-semibold text-[#20271A] break-words" style={{ fontFamily: DISPLAY }}>
                  {user.user_metadata?.first_name && user.user_metadata?.last_name
                    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                    : user.email}
                </h2>
                <p className="text-sm text-[#6E6A59] mt-1 break-words">{user.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/settings`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#20271A] border border-[#E5E0D8] rounded-lg hover:bg-[#FBF8F1]"
                >
                  <Settings size={16} strokeWidth={1.5} aria-hidden="true" /> {t.settings}
                </Link>
                <Link
                  href={`/dashboard/security`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#20271A] border border-[#E5E0D8] rounded-lg hover:bg-[#FBF8F1]"
                >
                  <Lock size={16} strokeWidth={1.5} aria-hidden="true" /> {t.security}
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-[#E5E0D8] p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#6E6A59] font-medium">{t.upcoming}</p>
                  <p className="text-4xl font-bold" style={{ color: G }}>
                    {upcomingBookings.length}
                  </p>
                </div>
                <Calendar size={28} strokeWidth={1.5} color={G} aria-hidden="true" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#E5E0D8] p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#6E6A59] font-medium">{t.completed}</p>
                  <p className="text-4xl font-bold" style={{ color: G }}>
                    {completedBookings.length}
                  </p>
                </div>
                <Check size={28} strokeWidth={1.5} color={G} aria-hidden="true" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-[#E5E0D8] p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#6E6A59] font-medium">{t.waitlisted}</p>
                  <p className="text-4xl font-bold" style={{ color: G }}>
                    {waitlistedBookings.length}
                  </p>
                </div>
                <Hourglass size={28} strokeWidth={1.5} color={G} aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Upcoming Bookings Section */}
          {upcomingBookings.length > 0 && (
            <div className="bg-white rounded-lg border border-[#E5E0D8] overflow-hidden shadow-sm mb-8">
              <div className="px-6 py-4 border-b border-[#E5E0D8] bg-[#FBF8F1]">
                <h2 className="flex items-center gap-2 font-semibold text-[#20271A]" style={{ fontFamily: DISPLAY }}>
                  <Calendar size={18} strokeWidth={1.5} color={G} aria-hidden="true" /> {t.upcoming}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="stack-table w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E0D8] text-left text-[#6E6A59] bg-[#FBF8F1]">
                      <th className="px-6 py-3 font-medium">{t.tour}</th>
                      <th className="px-6 py-3 font-medium">{t.startDate}</th>
                      <th className="px-6 py-3 font-medium">{t.endDate}</th>
                      <th className="px-6 py-3 font-medium">{t.travellers}</th>
                      <th className="px-6 py-3 font-medium">{t.price}</th>
                      <th className="px-6 py-3 font-medium">{t.status}</th>
                      <th className="px-6 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingBookings.map((booking: any) => {
                      const departure = booking.departures as any
                      const tour = departure?.tours as any
                      const dates = resolveTripDates(booking)
                      return (
                        <tr key={booking.id} className="border-b border-[#E5E0D8] hover:bg-[#FBF8F1]">
                          <td data-label={t.tour} className="px-6 py-4">
                            <span className="font-medium text-[#20271A]">
                              {(isAr ? (tour?.title_ar || tour?.title_en) : tour?.title_en) || t.privateTrip}
                            </span>
                          </td>
                          <td data-label={t.startDate} className="px-6 py-4 text-[#6E6A59]">
                            {dates.startDate ? new Date(dates.startDate).toLocaleDateString('en-GB') : t.datesTbc}
                          </td>
                          <td data-label={t.endDate} className="px-6 py-4 text-[#6E6A59]">
                            {dates.endDate ? new Date(dates.endDate).toLocaleDateString('en-GB') : t.datesTbc}
                          </td>
                          <td data-label={t.travellers} className="px-6 py-4 text-[#6E6A59]">
                            {booking.number_of_travellers}
                          </td>
                          <td data-label={t.price} className="px-6 py-4 text-[#20271A] font-medium">
                            ${Number(booking.total_price_usd).toLocaleString()}
                          </td>
                          <td data-label={t.status} className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/dashboard/bookings/${booking.id}`}
                              className="text-sm font-medium hover:underline"
                              style={{ color: G }}
                            >
                              {t.viewDetails}
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Browse More Tours */}
          {upcomingBookings.length === 0 && (
            <div className="bg-white rounded-lg border border-[#E5E0D8] p-12 text-center shadow-sm">
              <Image
                src="/logo-safari-riders.png"
                alt=""
                width={45}
                height={64}
                className="mx-auto mb-4"
              />
              <h2 className="text-2xl font-semibold text-[#20271A] mb-2" style={{ fontFamily: DISPLAY }}>{t.noBookings}</h2>
              <p className="text-[#6E6A59] mb-6">{t.readyNext}</p>
              <Link
                href={localePath('/departures', locale)}
                className="inline-block px-6 py-3 rounded-lg font-medium text-white"
                style={{ backgroundColor: G }}
              >
                {t.browse}
              </Link>
            </div>
          )}

          {/* Completed Bookings Section */}
          {completedBookings.length > 0 && (
            <div className="bg-white rounded-lg border border-[#E5E0D8] overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#E5E0D8] bg-[#FBF8F1]">
                <h2 className="flex items-center gap-2 font-semibold text-[#20271A]" style={{ fontFamily: DISPLAY }}>
                  <Check size={18} strokeWidth={1.5} color={G} aria-hidden="true" /> {t.completed}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="stack-table w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E0D8] text-left text-[#6E6A59] bg-[#FBF8F1]">
                      <th className="px-6 py-3 font-medium">{t.tour}</th>
                      <th className="px-6 py-3 font-medium">{t.endDate}</th>
                      <th className="px-6 py-3 font-medium">{t.travellers}</th>
                      <th className="px-6 py-3 font-medium">{t.pricePaid}</th>
                      <th className="px-6 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedBookings.map((booking: any) => {
                      const departure = booking.departures as any
                      const tour = departure?.tours as any
                      const dates = resolveTripDates(booking)
                      return (
                        <tr key={booking.id} className="border-b border-[#E5E0D8] hover:bg-[#FBF8F1]">
                          <td data-label={t.tour} className="px-6 py-4">
                            <span className="font-medium text-[#20271A]">
                              {(isAr ? (tour?.title_ar || tour?.title_en) : tour?.title_en) || t.privateTrip}
                            </span>
                          </td>
                          <td data-label={t.endDate} className="px-6 py-4 text-[#6E6A59]">
                            {dates.endDate ? new Date(dates.endDate).toLocaleDateString('en-GB') : t.datesTbc}
                          </td>
                          <td data-label={t.travellers} className="px-6 py-4 text-[#6E6A59]">
                            {booking.number_of_travellers}
                          </td>
                          <td data-label={t.pricePaid} className="px-6 py-4 text-[#20271A] font-medium">
                            ${Number(booking.total_price_usd).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/dashboard/bookings/${booking.id}`}
                              className="text-sm font-medium hover:underline"
                              style={{ color: G }}
                            >
                              {t.view}
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

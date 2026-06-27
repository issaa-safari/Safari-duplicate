import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import { getServerLocale } from '@/lib/i18n'

const G = '#7A9A4A'

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

  if (!user) redirect('/login')

  const t = isAr ? {
    myDashboard: 'لوحة التحكم', welcome: 'مرحباً بعودتك! أدر حجوزاتك وحسابك',
    settings: 'الإعدادات', security: 'الأمان',
    upcoming: 'الحجوزات القادمة', completed: 'الجولات المكتملة', waitlisted: 'قائمة الانتظار',
    tour: 'الجولة', startDate: 'تاريخ البداية', endDate: 'تاريخ النهاية', travellers: 'المسافرون',
    price: 'السعر', status: 'الحالة', viewDetails: 'عرض التفاصيل', view: 'عرض', pricePaid: 'المبلغ المدفوع',
    noBookings: 'لا توجد حجوزات بعد', readyNext: 'هل أنت مستعد لمغامرة السفاري القادمة؟',
    browse: 'تصفح الرحلات المتاحة',
  } : {
    myDashboard: 'My Dashboard', welcome: 'Welcome back! Manage your bookings and account',
    settings: 'Settings', security: 'Security',
    upcoming: 'Upcoming Bookings', completed: 'Completed Tours', waitlisted: 'Waitlisted Bookings',
    tour: 'Tour', startDate: 'Start Date', endDate: 'End Date', travellers: 'Travellers',
    price: 'Price', status: 'Status', viewDetails: 'View Details', view: 'View', pricePaid: 'Price Paid',
    noBookings: 'No bookings yet', readyNext: 'Ready for your next safari adventure?',
    browse: 'Browse Available Departures',
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

  const upcomingBookings = bookings?.filter(b => {
    const departure = b.departures as any
    return new Date(departure?.end_date) > new Date() && b.status !== 'cancelled'
  }) ?? []

  const completedBookings = bookings?.filter(b => {
    const departure = b.departures as any
    return new Date(departure?.end_date) <= new Date()
  }) ?? []

  const waitlistedBookings = bookings?.filter(b => b.status === 'pending') ?? []

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <PublicHeader />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.myDashboard}</h1>
            <p className="text-gray-600">{t.welcome}</p>
          </div>

          {/* User Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {user.user_metadata?.first_name && user.user_metadata?.last_name
                    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                    : user.email}
                </h2>
                <p className="text-sm text-gray-600 mt-1">{user.email}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/dashboard/settings?lang=${locale}`}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ⚙️ {t.settings}
                </Link>
                <Link
                  href={`/dashboard/security?lang=${locale}`}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  🔒 {t.security}
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{t.upcoming}</p>
                  <p className="text-4xl font-bold" style={{ color: G }}>
                    {upcomingBookings.length}
                  </p>
                </div>
                <div className="text-3xl">📅</div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{t.completed}</p>
                  <p className="text-4xl font-bold" style={{ color: G }}>
                    {completedBookings.length}
                  </p>
                </div>
                <div className="text-3xl">✓</div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{t.waitlisted}</p>
                  <p className="text-4xl font-bold" style={{ color: G }}>
                    {waitlistedBookings.length}
                  </p>
                </div>
                <div className="text-3xl">⏳</div>
              </div>
            </div>
          </div>

          {/* Upcoming Bookings Section */}
          {upcomingBookings.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-8">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-900">📅 {t.upcoming}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-600 bg-gray-50">
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
                      return (
                        <tr key={booking.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-900">
                              {isAr ? (tour?.title_ar || tour?.title_en) : tour?.title_en}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {new Date(departure?.start_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {new Date(departure?.end_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {booking.number_of_travellers}
                          </td>
                          <td className="px-6 py-4 text-gray-900 font-medium">
                            ${Number(booking.total_price_usd).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
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
                              href={`/dashboard/bookings/${booking.id}?lang=${locale}`}
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
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
              <div className="text-4xl mb-4">🦁</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t.noBookings}</h2>
              <p className="text-gray-600 mb-6">{t.readyNext}</p>
              <Link
                href={`/departures?lang=${locale}`}
                className="inline-block px-6 py-3 rounded-lg font-medium text-white"
                style={{ backgroundColor: G }}
              >
                {t.browse}
              </Link>
            </div>
          )}

          {/* Completed Bookings Section */}
          {completedBookings.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-900">✓ {t.completed}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-600 bg-gray-50">
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
                      return (
                        <tr key={booking.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-900">
                              {isAr ? (tour?.title_ar || tour?.title_en) : tour?.title_en}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {new Date(departure?.end_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {booking.number_of_travellers}
                          </td>
                          <td className="px-6 py-4 text-gray-900 font-medium">
                            ${Number(booking.total_price_usd).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/dashboard/bookings/${booking.id}?lang=${locale}`}
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

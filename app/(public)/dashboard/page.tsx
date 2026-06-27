import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'

const G = '#7A9A4A'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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
    <>
      <PublicHeader />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Dashboard</h1>
            <p className="text-gray-600">Welcome back! Manage your bookings and account</p>
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
                  href="/dashboard/settings"
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ⚙️ Settings
                </Link>
                <Link
                  href="/dashboard/security"
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  🔒 Security
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Upcoming Bookings</p>
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
                  <p className="text-sm text-gray-600 font-medium">Completed Tours</p>
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
                  <p className="text-sm text-gray-600 font-medium">Waitlisted Bookings</p>
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
                <h2 className="font-semibold text-gray-900">📅 Upcoming Bookings</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-600 bg-gray-50">
                      <th className="px-6 py-3 font-medium">Tour</th>
                      <th className="px-6 py-3 font-medium">Start Date</th>
                      <th className="px-6 py-3 font-medium">End Date</th>
                      <th className="px-6 py-3 font-medium">Travellers</th>
                      <th className="px-6 py-3 font-medium">Price</th>
                      <th className="px-6 py-3 font-medium">Status</th>
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
                              {tour?.title_en}
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
                              href={`/dashboard/bookings/${booking.id}`}
                              className="text-sm font-medium hover:underline"
                              style={{ color: G }}
                            >
                              View Details
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
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">No bookings yet</h2>
              <p className="text-gray-600 mb-6">Ready for your next safari adventure?</p>
              <Link
                href="/departures"
                className="inline-block px-6 py-3 rounded-lg font-medium text-white"
                style={{ backgroundColor: G }}
              >
                Browse Available Departures
              </Link>
            </div>
          )}

          {/* Completed Bookings Section */}
          {completedBookings.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-900">✓ Completed Tours</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-600 bg-gray-50">
                      <th className="px-6 py-3 font-medium">Tour</th>
                      <th className="px-6 py-3 font-medium">End Date</th>
                      <th className="px-6 py-3 font-medium">Travellers</th>
                      <th className="px-6 py-3 font-medium">Price Paid</th>
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
                              {tour?.title_en}
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
                              href={`/dashboard/bookings/${booking.id}`}
                              className="text-sm font-medium hover:underline"
                              style={{ color: G }}
                            >
                              View
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
    </>
  )
}

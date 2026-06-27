import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'

const G = '#7A9A4A'

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Get booking details
  const { data: booking } = await admin
    .from('bookings')
    .select(`
      *,
      departures (
        id,
        start_date,
        end_date,
        tours (
          id,
          title_en,
          title_ar
        )
      ),
      booking_travellers (
        id,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        nationality,
        passport_number
      )
    `)
    .eq('id', id)
    .single()

  if (!booking) notFound()

  // Authorise: the booking must include a traveller whose email matches the account.
  const userEmail = (user.email ?? '').toLowerCase()
  const ownsBooking = (booking.booking_travellers as any[])?.some(
    (t) => (t.email ?? '').toLowerCase() === userEmail
  )
  if (!ownsBooking) notFound()

  const departure = booking.departures as any
  const tour = departure?.tours as any
  const travellers = booking.booking_travellers as any[]

  const statusMap: Record<string, { bg: string; text: string; badge: string }> = {
    confirmed: { bg: 'bg-green-50', text: 'text-green-900', badge: 'bg-green-100 text-green-700' },
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-900', badge: 'bg-yellow-100 text-yellow-700' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-900', badge: 'bg-red-100 text-red-700' },
  }

  const status = statusMap[booking.status as string] || { bg: 'bg-gray-50', text: 'text-gray-900', badge: 'bg-gray-100 text-gray-600' }

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 mb-6 inline-block">
            ← Back to Dashboard
          </Link>

          {/* Booking Summary */}
          <div className={`rounded-lg border border-gray-200 p-6 mb-6 ${status.bg}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{tour?.title_en}</h1>
                <p className="text-sm text-gray-600 mt-1">Booking ID: {id}</p>
              </div>
              <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${status.badge}`}>
                {booking.status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-300">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Start Date</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {departure?.start_date ? new Date(departure.start_date).toLocaleDateString('en-GB') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">End Date</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {departure?.end_date ? new Date(departure.end_date).toLocaleDateString('en-GB') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Travellers</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{booking.number_of_travellers}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Total Price</p>
                <p className="text-lg font-bold mt-1" style={{ color: G }}>
                  ${Number(booking.total_price_usd).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Traveller Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Traveller Information</h2>
            <div className="space-y-6">
              {travellers.map((traveller, index) => (
                <div key={traveller.id} className="pb-6 border-b border-gray-200 last:border-b-0">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Traveller {index + 1}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Name</p>
                      <p className="font-medium text-gray-900">{traveller.first_name} {traveller.last_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{traveller.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">{traveller.phone}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Date of Birth</p>
                      <p className="font-medium text-gray-900">
                        {traveller.date_of_birth ? new Date(traveller.date_of_birth).toLocaleDateString('en-GB') : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Nationality</p>
                      <p className="font-medium text-gray-900">{traveller.nationality}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Passport Number</p>
                      <p className="font-medium text-gray-900">{traveller.passport_number}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Booking Date */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600">Booking Confirmation Date</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {new Date(booking.created_at).toLocaleString('en-GB')}
            </p>
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  )
}

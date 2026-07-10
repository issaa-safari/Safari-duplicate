import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/admin/status-badge'

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: bookings } = await admin
    .from('bookings')
    .select(`
      id,
      departure_id,
      number_of_travellers,
      total_price_usd,
      status,
      created_at,
      departures (
        start_date,
        end_date,
        price_usd,
        tours (
          title_en
        )
      ),
      booking_travellers (
        id,
        first_name,
        last_name,
        email,
        phone,
        passport_number
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-brand-ink">Bookings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage all departure bookings</p>
      </div>

      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {!bookings || bookings.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500 mb-4">No bookings yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="stack-table w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500 bg-gray-50">
                  <th className="px-4 py-3 font-medium">Tour</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Travellers</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Booked</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking: any) => {
                  const departure = booking.departures as any
                  const tour = departure?.tours as any
                  const travellers = booking.booking_travellers as any[]

                  return (
                    <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td data-label="Tour" className="px-4 py-3">
                        <p className="font-medium text-gray-900">{tour?.title_en ?? 'Untitled tour'}</p>
                      </td>
                      <td data-label="Dates" className="px-4 py-3 text-gray-600">
                        {departure?.start_date ? new Date(departure.start_date).toLocaleDateString('en-GB') : '—'}
                        {' → '}
                        {departure?.end_date ? new Date(departure.end_date).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td data-label="Travellers" className="px-4 py-3 text-gray-700">
                        <span className="font-medium">{booking.number_of_travellers}</span>
                        <div className="text-xs text-gray-500 mt-1">
                          {travellers?.map(t => `${t.first_name} ${t.last_name}`).join(', ')}
                        </div>
                      </td>
                      <td data-label="Price" className="px-4 py-3 text-gray-600">
                        ${Number(booking.total_price_usd).toLocaleString()}
                      </td>
                      <td data-label="Status" className="px-4 py-3">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td data-label="Booked" className="px-4 py-3 text-xs text-gray-500">
                        {new Date(booking.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/bookings/${booking.id}`}
                          className="text-xs text-[var(--olive)] hover:underline">
                          View Details
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

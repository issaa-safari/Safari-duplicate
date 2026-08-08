import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import BookingDetailForm from './form'
import { getTripBalance } from '@/lib/server/accounting'

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('bookings')
    .select(`
      id,
      departure_id,
      number_of_travellers,
      total_price_usd,
      status,
      created_at,
      departures (
        id,
        start_date,
        end_date,
        price_usd,
        max_seats,
        booked_seats,
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

  // Money received against this trip, and what that leaves owing. Resolved
  // through the trip reference so a booking promoted from a quote still finds
  // payments recorded under the quote.
  const balance = await getTripBalance(admin, { bookingId: id })

  return <BookingDetailForm booking={booking} bookingId={id} balance={balance} />
}

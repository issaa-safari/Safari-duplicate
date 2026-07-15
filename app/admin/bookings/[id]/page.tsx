import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import BookingDetailForm from './form'

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

  // Payment records (group_25) so the booking page shows paid vs. balance.
  const { data: payments } = await admin
    .from('booking_payments')
    .select('amount_usd, status, method, reference, created_at')
    .eq('booking_id', id)
    .order('created_at', { ascending: true })

  return <BookingDetailForm booking={booking} bookingId={id} payments={payments ?? []} />
}

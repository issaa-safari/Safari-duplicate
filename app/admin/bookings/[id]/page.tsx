import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import BookingDetailForm from './form'
import { getTripBalance } from '@/lib/server/accounting'
import { getTripInvoiceSummary } from '@/lib/server/invoices'
import type { Service } from '@/lib/types'

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
      request_id,
      client_id,
      start_date,
      end_date,
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
      ),
      clients (
        id,
        first_name,
        last_name,
        email
      ),
      requests (
        id,
        reference,
        stage
      )
    `)
    .eq('id', id)
    .single()

  if (!booking) notFound()

  // Money received against this trip, and what that leaves owing. Resolved
  // through the trip reference so a booking promoted from a quote still finds
  // payments recorded under the quote.
  const balance = await getTripBalance(admin, { bookingId: id })

  const [{ data: catalogue }, invoiceSummary] = await Promise.all([
    admin
      .from('services')
      .select('id, name_en, name_ar, default_price_usd, pricing_unit, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .order('name_en'),
    getTripInvoiceSummary(admin, balance.ref),
  ])

  return (
    <BookingDetailForm
      booking={booking}
      bookingId={id}
      balance={balance}
      catalogue={(catalogue ?? []) as unknown as Service[]}
      invoices={invoiceSummary.invoices.map((s) => ({
        id: s.invoice.id,
        invoice_number: s.invoice.invoice_number,
        displayStatus: s.displayStatus,
      }))}
    />
  )
}

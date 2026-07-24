import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import VouchersClient from './vouchers-client'
import type { HotelVoucher } from '@/lib/types'

async function requestBaseUrl() {
  const host = (await headers()).get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

// A voucher joined with just enough trip context to render the list and let the
// admin jump back to the departure or booking it belongs to.
export type VoucherWithContext = HotelVoucher & {
  departures: { id: string; start_date: string; end_date: string; tours: { title_en: string | null } | null } | null
}

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default async function VouchersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; departure?: string; booking?: string }>
}) {
  const { status, departure, booking } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  let query = admin
    .from('hotel_vouchers')
    .select('*, departures ( id, start_date, end_date, tours ( title_en ) )')
    .order('check_in', { ascending: true })

  if (status && status !== 'all') query = query.eq('status', status)
  if (departure) query = query.eq('departure_id', departure)
  if (booking) query = query.eq('booking_id', booking)

  const { data: vouchers } = await query

  // Departures for the "generate from a departure" picker — upcoming first.
  const { data: departures } = await admin
    .from('departures')
    .select('id, start_date, end_date, tours ( title_en )')
    .order('start_date', { ascending: false })
    .limit(60)

  // Supabase infers an embedded to-one relation as an array; normalise it.
  const departureOptions = ((departures ?? []) as unknown as Array<{
    id: string
    start_date: string
    end_date: string
    tours: { title_en: string | null } | { title_en: string | null }[] | null
  }>).map(d => {
    const tour = Array.isArray(d.tours) ? d.tours[0] : d.tours
    return {
      id: d.id,
      label: `${tour?.title_en ?? 'Departure'} · ${d.start_date} → ${d.end_date}`,
    }
  })

  const baseUrl = await requestBaseUrl()
  const activeStatus = status && STATUS_FILTERS.some(s => s.value === status) ? status : 'all'

  // A scoped view (linked from a specific departure or booking) narrows both the
  // list and the generator to that one trip.
  const scope = departure
    ? { kind: 'departure' as const, id: departure }
    : booking
      ? { kind: 'booking' as const, id: booking }
      : null

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Hotel Vouchers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every accommodation booking voucher across all departures and bookings. Generate vouchers from a
          trip’s itinerary, edit rooms and guests, then email each hotel a confirmation.
        </p>
        {scope && (
          <p className="mt-2 text-xs text-muted-foreground">
            Showing one {scope.kind}.{' '}
            <Link href="/admin/vouchers" className="text-primary hover:underline">
              View all vouchers →
            </Link>
          </p>
        )}
      </div>

      <VouchersClient
        vouchers={(vouchers as VoucherWithContext[]) ?? []}
        departureOptions={departureOptions}
        statusFilters={STATUS_FILTERS}
        activeStatus={activeStatus}
        scope={scope}
        baseUrl={baseUrl}
      />
    </div>
  )
}

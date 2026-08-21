import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import NewBookingForm, {
  type ClientOption,
  type DepartureOption,
  type RequestOption,
} from './new-booking-form'

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ departure?: string; request?: string; client?: string }>
}) {
  const { departure: preselect, request: preselectRequest, client: preselectClient } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  const [{ data: departures }, { data: requests }, { data: clients }] = await Promise.all([
    admin
      .from('departures')
      .select('id, start_date, end_date, max_seats, booked_seats, price_usd, price_single_usd, status, tours ( title_en )')
      .eq('is_active', true)
      .order('start_date', { ascending: true }),
    // Live enquiries only — an archived request is not something you would book
    // against, and the list is a picker, not an audit trail.
    admin
      .from('requests')
      .select('id, reference, stage, group_size, preferred_start_date, clients ( first_name, last_name ), tours ( title_en )')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(200),
    admin
      .from('clients')
      .select('id, first_name, last_name, email')
      .order('first_name', { ascending: true })
      .limit(500),
  ])

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const departureOptions: DepartureOption[] = (departures ?? []).map((d: any) => ({
    id: d.id,
    label: d.tours?.title_en ?? 'Tour',
    startDate: d.start_date,
    endDate: d.end_date,
    seatsLeft: Math.max(0, d.max_seats - d.booked_seats),
    price: Number(d.price_usd ?? d.price_single_usd ?? 0),
    status: d.status,
  }))

  const requestOptions: RequestOption[] = (requests ?? []).map((r: any) => {
    const c = r.clients as any
    const name = c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() : ''
    return {
      id: r.id,
      reference: r.reference,
      clientName: name || null,
      tourTitle: (r.tours as any)?.title_en ?? null,
      stage: r.stage,
      groupSize: r.group_size ?? null,
      startDate: r.preferred_start_date ?? null,
    }
  })

  const clientOptions: ClientOption[] = (clients ?? []).map((c: any) => ({
    id: c.id,
    name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || (c.email ?? 'Unnamed client'),
    email: c.email ?? null,
  }))
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">New Booking</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Book onto a scheduled departure, or record a private trip against a request or a client
        </p>
      </div>
      <NewBookingForm
        departures={departureOptions}
        requests={requestOptions}
        clients={clientOptions}
        preselectId={preselect ?? null}
        preselectRequestId={preselectRequest ?? null}
        preselectClientId={preselectClient ?? null}
      />
    </div>
  )
}

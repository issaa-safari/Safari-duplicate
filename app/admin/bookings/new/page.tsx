import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import NewBookingForm, { type DepartureOption } from './new-booking-form'

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ departure?: string }>
}) {
  const { departure: preselect } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: departures } = await admin
    .from('departures')
    .select('id, start_date, end_date, max_seats, booked_seats, price_usd, status, tours ( title_en )')
    .eq('is_active', true)
    .order('start_date', { ascending: true })

  const options: DepartureOption[] = (departures ?? []).map((d: any) => ({
    id: d.id,
    label: d.tours?.title_en ?? 'Tour',
    startDate: d.start_date,
    endDate: d.end_date,
    seatsLeft: Math.max(0, d.max_seats - d.booked_seats),
    price: Number(d.price_usd),
    status: d.status,
  }))

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">New Booking</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manually book travellers onto a departure from the back office
        </p>
      </div>
      <NewBookingForm departures={options} preselectId={preselect ?? null} />
    </div>
  )
}

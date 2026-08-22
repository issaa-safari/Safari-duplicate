import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RequestForm, { type ClientOption, type DepartureOption, type TourOption } from '../request-form'

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { client: preselectedClientId } = await searchParams

  // clients is RLS-locked to service_role (group_34), so read via admin.
  const admin = createAdminClient()
  const [{ data: clientRows }, { data: tourRows }, { data: departureRows }] = await Promise.all([
    admin
      .from('clients')
      .select('id, first_name, last_name, email')
      .order('first_name'),
    admin
      .from('tours')
      .select('id, title_en, type')
      .eq('status', 'active')
      .order('title_en'),
    admin
      .from('departures')
      .select('id, start_date, end_date, kind, tours ( title_en )')
      .eq('kind', 'scheduled_group')
      .eq('is_active', true)
      .eq('status', 'available')
      .gte('end_date', new Date().toISOString().slice(0, 10))
      .order('start_date'),
  ])

  const clients: ClientOption[] = (clientRows ?? []).map((c: { id: string; first_name: string | null; last_name: string | null; email: string | null }) => ({
    id: c.id,
    name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.email || 'Unnamed client',
    email: c.email,
  }))
  const tours: TourOption[] = (tourRows ?? []).map(tour => ({
    id: tour.id,
    title: tour.title_en,
    type: tour.type,
  }))
  const departures: DepartureOption[] = (departureRows ?? []).map(row => {
    const tour = Array.isArray(row.tours) ? row.tours[0] : row.tours
    return {
      id: row.id,
      title: tour?.title_en ?? 'Scheduled trip',
      startDate: row.start_date,
      endDate: row.end_date,
    }
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/sales" className="text-sm text-muted-foreground hover:text-foreground">
          Back to Sales Desk
        </Link>
        <h1 className="text-xl font-semibold text-foreground">New Request &amp; Proposal</h1>
      </div>
      <RequestForm
        clients={clients}
        initialClientId={preselectedClientId ?? null}
        tours={tours}
        departures={departures}
      />
    </div>
  )
}

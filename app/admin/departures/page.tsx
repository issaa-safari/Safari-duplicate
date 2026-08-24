import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button'
import { toggleDeparturePublished } from './[id]/actions'
import StatusBadge from '@/components/admin/status-badge'
import { departurePublishingBlockers } from '@/lib/departure-publishing'

type ReadinessTraveller = {
  is_rider: boolean | null
  motorbike_id: string | null
  passport_number: string | null
  booking_traveller_flights: Array<{ direction: string; scheduled_at: string | null }> | null
  traveller_agreements: Array<{ status: string }> | null
}

type OperationsDeparture = {
  id: string
  kind: 'scheduled_group' | 'private_custom'
  operation_title: string | null
  is_public: boolean
  start_date: string
  end_date: string
  max_seats: number
  booked_seats: number
  price_usd: number | null
  price_single_usd: number | null
  status: string
  is_active: boolean
  tours: {
    title_en: string | null
    type: string | null
    slug: string | null
    status: string
    is_active: boolean
    show_on_website: boolean
    hero_image_url: string | null
    overview_en: string | null
    tour_days: Array<{ id: string }> | null
  } | Array<{
    title_en: string | null
    type: string | null
    slug: string | null
    status: string
    is_active: boolean
    show_on_website: boolean
    hero_image_url: string | null
    overview_en: string | null
    tour_days: Array<{ id: string }> | null
  }> | null
  bookings: Array<{ status: string; booking_travellers: ReadinessTraveller[] | null }> | null
}

export default async function DeparturesPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>
}) {
  const { show } = await searchParams
  const showArchived = show === 'archived'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: departures } = await admin
    .from('departures')
    .select(`
      *,
      tours (
        title_en, type, slug, status, is_active, show_on_website, hero_image_url, overview_en,
        tour_days ( id )
      ),
      bookings (
        id, status,
        booking_travellers (
          id, is_rider, motorbike_id, passport_number,
          booking_traveller_flights ( direction, scheduled_at ),
          traveller_agreements ( status )
        )
      )
    `)
    .eq('is_active', showArchived ? false : true)
    .order('start_date', { ascending: true })

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Trip Operations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Readiness, manifests and logistics for scheduled and private trips</p>
        </div>
        <ButtonLink href="/admin/departures/new" size="sm">+ New Departure</ButtonLink>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <Link
          href="/admin/departures"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            !showArchived
              ? 'border-primary-strong text-brand-text'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}>
          Active trips
        </Link>
        <Link
          href="/admin/departures?show=archived"
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            showArchived
              ? 'border-primary-strong text-brand-text'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}>
          Archived trips
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {!departures || departures.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {showArchived ? 'No archived departures.' : 'No departures scheduled yet.'}
            </p>
            {!showArchived && (
              <Link href="/admin/departures/new"
                className="text-sm font-medium text-brand-text hover:underline">
                Schedule your first departure
              </Link>
            )}
          </div>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Trip</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Available seats</th>
                <th className="px-4 py-3 font-medium">Readiness</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Website</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {((departures ?? []) as unknown as OperationsDeparture[]).map(dep => {
                const tour = Array.isArray(dep.tours) ? dep.tours[0] : dep.tours
                const available = dep.max_seats - dep.booked_seats
                const bookings = (dep.bookings ?? []).filter(booking => booking.status !== 'cancelled')
                const travellers = bookings.flatMap(booking => booking.booking_travellers ?? [])
                const riders = travellers.filter(traveller => traveller.is_rider !== false)
                const missingArrivals = travellers.filter(traveller =>
                  !(traveller.booking_traveller_flights ?? []).some(flight =>
                    flight.direction === 'arrival' && flight.scheduled_at,
                  ),
                ).length
                const missingBikes = riders.filter(traveller => !traveller.motorbike_id).length
                const missingPassports = travellers.filter(traveller => !traveller.passport_number).length
                const unsigned = travellers.filter(traveller =>
                  !(traveller.traveller_agreements ?? []).some(agreement => agreement.status === 'signed'),
                ).length
                const readinessIssues = missingArrivals + missingBikes + missingPassports + unsigned
                const publishingBlockers = departurePublishingBlockers(dep)
                const publishingReady = publishingBlockers.length === 0
                return (
                  <tr key={dep.id} className="border-b border-border/70 hover:bg-muted">
                    <td data-label="Trip" className="px-4 py-3">
                      <p className="font-medium text-foreground">{tour?.title_en ?? dep.operation_title ?? 'Untitled trip'}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {dep.kind === 'private_custom' ? 'Private custom' : (tour?.type ?? 'Scheduled group')}
                      </p>
                    </td>
                    <td data-label="Dates" className="px-4 py-3 text-muted-foreground">
                      {new Date(dep.start_date).toLocaleDateString('en-GB')}
                      {' â†’ '}
                      {new Date(dep.end_date).toLocaleDateString('en-GB')}
                    </td>
                    <td data-label="Available seats" className="px-4 py-3">
                      <span className={available <= 0 ? 'text-destructive font-medium' : 'text-foreground'}>
                        {available} / {dep.max_seats}
                      </span>
                      <span className="text-xs text-muted-foreground block">{dep.booked_seats} booked</span>
                    </td>
                    <td data-label="Readiness" className="px-4 py-3">
                      {travellers.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No travellers</span>
                      ) : readinessIssues === 0 ? (
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">Ready</span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                          {readinessIssues} check{readinessIssues === 1 ? '' : 's'}
                        </span>
                      )}
                    </td>
                    <td data-label="Price" className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {dep.price_usd != null
                        ? `$${Number(dep.price_usd).toLocaleString()}`
                        : dep.price_single_usd != null
                          ? `$${Number(dep.price_single_usd).toLocaleString()} (single only)`
                          : 'â€”'}
                    </td>
                    <td data-label="Status" className="px-4 py-3">
                      <StatusBadge status={dep.status} />
                    </td>
                    <td data-label="Website" className="px-4 py-3">
                      {dep.kind === 'private_custom' ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                          Private
                        </span>
                      ) : (
                        <form action={async () => { 'use server'; await toggleDeparturePublished(dep.id) }}>
                        {dep.is_public ? (
                          <div>
                            <button type="submit"
                              className={`text-xs px-2.5 py-1 rounded-full font-medium ${publishingReady ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                              title="Live on website â€” click to unpublish">
                              â— {publishingReady ? 'Published' : 'Published Â· fix'}
                            </button>
                            {!publishingReady && <p className="mt-1 max-w-44 text-[10px] leading-tight text-amber-800">{publishingBlockers[0]}</p>}
                          </div>
                        ) : (
                          <div>
                            <button type="submit" disabled={!publishingReady}
                              className="text-xs px-2.5 py-1 rounded-full font-medium bg-muted text-muted-foreground hover:bg-green-100 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-muted disabled:hover:text-muted-foreground"
                              title={publishingReady ? 'Hidden from website â€” click to publish' : publishingBlockers.join('; ')}>
                              â—‹ {publishingReady ? 'Publish' : 'Not ready'}
                            </button>
                            {!publishingReady && <p className="mt-1 max-w-44 text-[10px] leading-tight text-muted-foreground">{publishingBlockers[0]}</p>}
                          </div>
                        )}
                        </form>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={"/admin/departures/" + dep.id}
                        className="text-xs text-brand-text hover:underline">
                        Open workspace
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


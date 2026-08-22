import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  BedDouble,
  Bike,
  ClipboardCheck,
  FileSignature,
  PlaneLanding,
  Users,
} from 'lucide-react'
import { requestBaseUrl } from '@/lib/server/base-url'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DepartureEditForm, { type Departure, type TourDay } from './form'
import BookingLinkPanel from './booking-link-panel'
import DepartureOperationsNav from './operations-nav'
import type { BookingLink } from '@/lib/types'

type WorkspaceCardProps = {
  href: string
  label: string
  value: string
  detail: string
  icon: typeof Users
  attention?: boolean
}

type OperationsFlight = { direction: string; scheduled_at: string | null }
type OperationsAgreement = { status: string }
type OperationsTraveller = {
  id: string
  is_rider: boolean | null
  motorbike_id: string | null
  passport_number: string | null
  booking_traveller_flights: OperationsFlight[] | null
  traveller_agreements: OperationsAgreement[] | null
}
type OperationsBooking = {
  id: string
  request_id: string | null
  booking_travellers: OperationsTraveller[] | null
}
type OperationsTask = { id: string; is_done: boolean }

function WorkspaceCard({ href, label, value, detail, icon: Icon, attention }: WorkspaceCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`mt-2 text-2xl font-semibold ${attention ? 'text-amber-700' : 'text-foreground'}`}>{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="rounded-lg bg-muted p-2 text-brand-text transition group-hover:bg-accent">
          <Icon size={18} aria-hidden />
        </span>
      </div>
    </Link>
  )
}

export default async function DepartureOperationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: departure } = await admin
    .from('departures')
    .select(`
      *,
      tours ( id, title_en, title_ar, subtitle_en, overview_en, type )
    `)
    .eq('id', id)
    .single()
  if (!departure) notFound()

  const [{ data: tourDays }, { data: bookingLinks }, { data: bookings }, { data: vouchers }] = await Promise.all([
    admin.from('tour_days').select('*').eq('tour_id', departure.tour_id).order('day_number'),
    admin.from('booking_links').select('*').eq('departure_id', id).order('created_at', { ascending: false }),
    admin
      .from('bookings')
      .select(`
        id, request_id,
        booking_travellers (
          id, is_rider, motorbike_id, passport_number,
          booking_traveller_flights ( direction, scheduled_at ),
          traveller_agreements ( status )
        )
      `)
      .eq('departure_id', id)
      .neq('status', 'cancelled'),
    admin.from('hotel_vouchers').select('id, status').eq('departure_id', id),
  ])
  const parties = (bookings ?? []) as unknown as OperationsBooking[]
  const travellers = parties.flatMap(booking => booking.booking_travellers ?? [])
  const requestIds = [...new Set(parties.map(booking => booking.request_id).filter(Boolean))] as string[]

  let tasks: OperationsTask[] = []
  if (requestIds.length > 0) {
    const { data } = await admin
      .from('tasks')
      .select('id, is_done')
      .in('request_id', requestIds)
    tasks = (data ?? []) as OperationsTask[]
  }

  const riders = travellers.filter(traveller => traveller.is_rider !== false)
  const arrivals = travellers.filter(traveller =>
    (traveller.booking_traveller_flights ?? []).some(flight =>
      flight.direction === 'arrival' && flight.scheduled_at,
    ),
  ).length
  const bikes = riders.filter(traveller => traveller.motorbike_id).length
  const passports = travellers.filter(traveller => traveller.passport_number).length
  const agreements = travellers.filter(traveller =>
    (traveller.traveller_agreements ?? []).some(agreement => agreement.status === 'signed'),
  ).length
  const openTasks = tasks.filter(task => !task.is_done).length
  const voucherList = (vouchers ?? []) as Array<{ id: string; status: string }>
  const confirmedVouchers = voucherList.filter(voucher => voucher.status === 'confirmed').length
  const actionCount =
    Math.max(0, travellers.length - arrivals) +
    Math.max(0, riders.length - bikes) +
    Math.max(0, travellers.length - passports) +
    Math.max(0, travellers.length - agreements) +
    openTasks +
    voucherList.filter(voucher => voucher.status === 'draft' || voucher.status === 'sent').length

  const tour = Array.isArray(departure.tours) ? departure.tours[0] : departure.tours
  const baseUrl = await requestBaseUrl()
  const tourTitle = tour?.title_en ?? 'Safari departure'

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <Link href="/admin/departures" className="text-sm text-muted-foreground hover:text-foreground">
          ← All operations
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{tourTitle}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                travellers.length === 0
                  ? 'bg-muted text-muted-foreground'
                  : actionCount === 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
              }`}>
                {travellers.length === 0
                  ? 'No travellers yet'
                  : actionCount === 0
                    ? 'Ready'
                    : `${actionCount} item${actionCount === 1 ? '' : 's'} need attention`}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(departure.start_date).toLocaleDateString('en-GB')} →{' '}
              {new Date(departure.end_date).toLocaleDateString('en-GB')} · {departure.booked_seats}/{departure.max_seats} seats booked
            </p>
          </div>
          <Link
            href={`/admin/bookings/new?departure=${id}`}
            className="inline-flex items-center rounded-lg bg-primary-strong px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-strong-hover"
          >
            + Add booking
          </Link>
        </div>
      </div>

      <DepartureOperationsNav departureId={id} />

      <section aria-labelledby="readiness-heading">
        <div className="mb-3">
          <h2 id="readiness-heading" className="text-lg font-semibold text-foreground">Trip readiness</h2>
          <p className="text-sm text-muted-foreground">Open the area that needs work; no hunting through separate modules.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <WorkspaceCard
            href={`/admin/departures/${id}/manifest#manifest`}
            label="Manifest"
            value={`${travellers.length}`}
            detail={`${passports}/${travellers.length} passports on file`}
            icon={Users}
            attention={passports < travellers.length}
          />
          <WorkspaceCard
            href={`/admin/departures/${id}/manifest#logistics`}
            label="Logistics"
            value={`${arrivals}/${travellers.length}`}
            detail={`${bikes}/${riders.length} rider bikes assigned`}
            icon={PlaneLanding}
            attention={arrivals < travellers.length || bikes < riders.length}
          />
          <WorkspaceCard
            href={`/admin/departures/${id}/tasks`}
            label="Tasks"
            value={`${openTasks} open`}
            detail={`${tasks.length} total across linked requests`}
            icon={ClipboardCheck}
            attention={openTasks > 0}
          />
          <WorkspaceCard
            href={`/admin/departures/${id}/manifest#manifest`}
            label="Agreements"
            value={`${agreements}/${travellers.length}`}
            detail="traveller agreements signed"
            icon={FileSignature}
            attention={agreements < travellers.length}
          />
          <WorkspaceCard
            href={`/admin/vouchers?departure=${id}`}
            label="Vouchers"
            value={`${confirmedVouchers}/${voucherList.length}`}
            detail="hotel vouchers confirmed"
            icon={BedDouble}
            attention={confirmedVouchers < voucherList.length}
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <DepartureEditForm
          departure={{ ...departure, tours: tour } as unknown as Departure}
          departureId={id}
          tourDays={(tourDays ?? []) as unknown as TourDay[]}
        />
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Operational shortcuts</h2>
            <div className="mt-3 grid gap-2 text-sm">
              <Link href={`/admin/departures/${id}/manifest#logistics`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted">
                <PlaneLanding size={16} className="text-brand-text" /> Plan transfers and rooms
              </Link>
              <Link href={`/admin/departures/${id}/manifest#manifest`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted">
                <Bike size={16} className="text-brand-text" /> Assign bikes and issue agreements
              </Link>
              <Link href={`/admin/departures/${id}/tasks`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted">
                <ClipboardCheck size={16} className="text-brand-text" /> Review group tasks
              </Link>
              <Link href={`/admin/vouchers?departure=${id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted">
                <BedDouble size={16} className="text-brand-text" /> Prepare hotel vouchers
              </Link>
            </div>
          </div>

          <BookingLinkPanel
            departureId={id}
            links={(bookingLinks as BookingLink[]) ?? []}
            baseUrl={baseUrl}
            tourTitle={tourTitle}
          />
        </div>
      </div>
    </div>
  )
}

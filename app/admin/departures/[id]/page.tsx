import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  BedDouble,
  Bike,
  ClipboardCheck,
  FileSignature,
  PlaneLanding,
  PackageCheck,
  Users,
} from 'lucide-react'
import { requestBaseUrl } from '@/lib/server/base-url'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DepartureEditForm, { type Departure, type TourDay } from './form'
import BookingLinkPanel from './booking-link-panel'
import DepartureOperationsNav from './operations-nav'
import type { BookingLink } from '@/lib/types'
import DepartureResourceManager, {
  type StaffAssignment,
  type StaffOption,
  type VehicleAssignment,
  type VehicleOption,
} from './resource-manager'
import { calculateTripReadiness } from '@/lib/trip-readiness'

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
  total_price_usd: number | null
  booking_payments: Array<{ amount_usd: number | null; status: string }> | null
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
      tours ( id, title_en, title_ar, subtitle_en, overview_en, type, slug, status, is_active, show_on_website, hero_image_url )
    `)
    .eq('id', id)
    .single()
  if (!departure) notFound()

  const [
    { data: tourDays },
    { data: bookingLinks },
    { data: bookings },
    { data: vouchers },
    { data: staffAssignments },
    { data: vehicleAssignments },
    { data: staffOptions },
    { data: vehicleOptions },
  ] = await Promise.all([
    departure.tour_id
      ? admin.from('tour_days').select('*').eq('tour_id', departure.tour_id).order('day_number')
      : Promise.resolve({ data: [] }),
    admin.from('booking_links').select('*').eq('departure_id', id).order('created_at', { ascending: false }),
    admin
      .from('bookings')
      .select(`
        id, request_id, total_price_usd,
        booking_payments ( amount_usd, status ),
        booking_travellers (
          id, is_rider, motorbike_id, passport_number,
          booking_traveller_flights ( direction, scheduled_at ),
          traveller_agreements ( status )
        )
      `)
      .eq('departure_id', id)
      .neq('status', 'cancelled'),
    admin.from('hotel_vouchers').select('id, status').eq('departure_id', id),
    admin.from('departure_staff_assignments').select('id, tour_staff ( id, name, role )').eq('departure_id', id).order('created_at'),
    admin.from('departure_vehicle_assignments').select('id, seats_used, vehicles ( id, name, type, seats )').eq('departure_id', id).order('created_at'),
    admin.from('tour_staff').select('id, name, role').eq('is_active', true).order('name'),
    admin.from('vehicles').select('id, name, type, seats').eq('is_active', true).order('name'),
  ])
  const parties = (bookings ?? []) as unknown as OperationsBooking[]
  const bookingsMissingValue = parties.filter(booking => Number(booking.total_price_usd ?? 0) <= 0)
  const travellers = parties.flatMap(booking => booking.booking_travellers ?? [])
  const requestIds = [...new Set(parties.map(booking => booking.request_id).filter(Boolean))] as string[]

  const [{ data: tripTaskRows }, legacyTaskResult] = await Promise.all([
    admin.from('tasks').select('id, is_done').eq('departure_id', id),
    requestIds.length > 0
      ? admin.from('tasks').select('id, is_done').in('request_id', requestIds)
      : Promise.resolve({ data: [] }),
  ])
  const tasks = [...new Map(
    [...(tripTaskRows ?? []), ...(legacyTaskResult.data ?? [])]
      .map(task => [task.id, task as OperationsTask]),
  ).values()]

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
  const bookingValueUsd = parties.reduce((sum, booking) => sum + Number(booking.total_price_usd ?? 0), 0)
  const paidUsd = parties.reduce((sum, booking) => sum + (booking.booking_payments ?? [])
    .filter(payment => payment.status === 'paid')
    .reduce((paymentSum, payment) => paymentSum + Number(payment.amount_usd ?? 0), 0), 0)
  const readiness = calculateTripReadiness({
    travellers: travellers.length,
    passports,
    arrivals,
    riders: riders.length,
    bikes,
    agreements,
    tasks: tasks.length,
    openTasks,
    vouchers: voucherList.length,
    confirmedVouchers,
    bookingValueUsd,
    paidUsd,
  })
  const actionCount =
    Math.max(0, travellers.length - arrivals) +
    Math.max(0, riders.length - bikes) +
    Math.max(0, travellers.length - passports) +
    Math.max(0, travellers.length - agreements) +
    openTasks +
    voucherList.filter(voucher => voucher.status === 'draft' || voucher.status === 'sent').length

  const tour = Array.isArray(departure.tours) ? departure.tours[0] : departure.tours
  const baseUrl = await requestBaseUrl()
  const tourTitle = tour?.title_en ?? departure.operation_title ?? 'Private safari'

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
              {departure.kind === 'private_custom' && (
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">Private custom</span>
              )}
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
          {departure.kind !== 'private_custom' && <Link
            href={`/admin/bookings/new?departure=${id}`}
            className="inline-flex items-center rounded-lg bg-primary-strong px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-strong-hover"
          >
            + Add booking
          </Link>}
        </div>
      </div>

      <DepartureOperationsNav departureId={id} />

      {departure.kind === 'private_custom' && bookingsMissingValue.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Commercial details need review</p>
          <p className="mt-1">
            This legacy accepted proposal has no confirmed booking value. Correct the total and payment schedule before sending finance documents.
          </p>
          <Link
            href={`/admin/bookings/${bookingsMissingValue[0].id}`}
            className="mt-3 inline-flex font-medium text-amber-900 underline underline-offset-2"
          >
            Open booking and correct pricing
          </Link>
        </div>
      )}

      <section aria-labelledby="readiness-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="readiness-heading" className="text-lg font-semibold text-foreground">Trip readiness</h2>
            <p className="text-sm text-muted-foreground">Open the area that needs work; no hunting through separate modules.</p>
          </div>
          <div className="min-w-48 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Readiness score</span>
              <span className={`text-2xl font-semibold ${readiness.score >= 85 ? 'text-green-700' : readiness.score >= 50 ? 'text-amber-700' : 'text-red-700'}`}>{readiness.score}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Trip readiness"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={readiness.score}
              className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            >
              <div className={`h-full rounded-full ${readiness.score >= 85 ? 'bg-green-600' : readiness.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${readiness.score}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{readiness.label}{readiness.blockers.length > 0 ? ` · ${readiness.blockers.length} blocker${readiness.blockers.length === 1 ? '' : 's'}` : ''}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <WorkspaceCard
            href={`/admin/departures/${id}/manifest?view=travellers`}
            label="Travellers"
            value={`${travellers.length}`}
            detail={`${passports}/${travellers.length} passports on file`}
            icon={Users}
            attention={passports < travellers.length}
          />
          <WorkspaceCard
            href={`/admin/departures/${id}/manifest?view=logistics`}
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
            detail={`${tasks.length} total across trip and bookings`}
            icon={ClipboardCheck}
            attention={openTasks > 0}
          />
          <WorkspaceCard
            href={`/admin/departures/${id}/manifest?view=agreements`}
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

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm" aria-labelledby="trip-resources-heading">
        <div className="mb-4 border-b border-border pb-3">
          <h2 id="trip-resources-heading" className="text-lg font-semibold text-foreground">Trip team &amp; vehicles</h2>
          <p className="text-sm text-muted-foreground">Accepted request planning is copied here automatically; this is the editable operational source of truth.</p>
        </div>
        <DepartureResourceManager
          departureId={id}
          staffAssignments={(staffAssignments ?? []) as unknown as StaffAssignment[]}
          vehicleAssignments={(vehicleAssignments ?? []) as unknown as VehicleAssignment[]}
          staffOptions={(staffOptions ?? []) as unknown as StaffOption[]}
          vehicleOptions={(vehicleOptions ?? []) as unknown as VehicleOption[]}
        />
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
              <Link href={`/admin/departures/${id}/manifest?view=logistics`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted">
                <PlaneLanding size={16} className="text-brand-text" /> Plan transfers and rooms
              </Link>
              <Link href={`/admin/departures/${id}/manifest?view=travellers`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted">
                <Bike size={16} className="text-brand-text" /> Update traveller details and assign bikes
              </Link>
              <Link href={`/admin/departures/${id}/tasks`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted">
                <ClipboardCheck size={16} className="text-brand-text" /> Review group tasks
              </Link>
              <Link href={`/admin/vouchers?departure=${id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted">
                <BedDouble size={16} className="text-brand-text" /> Prepare hotel vouchers
              </Link>
              <Link href={`/admin/departures/${id}/trip-pack`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted">
                <PackageCheck size={16} className="text-brand-text" /> Open printable trip pack
              </Link>
            </div>
          </div>

          {departure.kind !== 'private_custom' && <BookingLinkPanel
            departureId={id}
            links={(bookingLinks as BookingLink[]) ?? []}
            baseUrl={baseUrl}
            tourTitle={tourTitle}
          />}
        </div>
      </div>
    </div>
  )
}

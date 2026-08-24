import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PrintButton from '@/components/public/print-button'
import DepartureOperationsNav from '../operations-nav'

type NamedRelation = { name: string | null; role?: string | null; type?: string | null; seats?: number | null }
type Flight = { direction: string; airline: string | null; flight_number: string | null; scheduled_at: string | null; airport: string | null }
type Traveller = {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  nationality: string | null
  passport_number: string | null
  is_rider: boolean | null
  room_label: string | null
  room_type: string | null
  dietary_requirements: string | null
  allergies: string | null
  emergency_contact: string | null
  motorbikes: NamedRelation | NamedRelation[] | null
  booking_traveller_flights: Flight[] | null
  traveller_agreements: Array<{ status: string }> | { status: string } | null
}
type Booking = {
  id: string
  clients: Array<{ first_name: string | null; last_name: string | null }> | { first_name: string | null; last_name: string | null } | null
  booking_travellers: Traveller[] | null
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

function name(traveller: Traveller) {
  return `${traveller.first_name ?? ''} ${traveller.last_name ?? ''}`.trim() || 'Unnamed traveller'
}

function flightLabel(flight: Flight | undefined) {
  if (!flight) return '—'
  const number = [flight.airline, flight.flight_number].filter(Boolean).join(' ') || 'Flight'
  const time = flight.scheduled_at ? new Date(flight.scheduled_at).toLocaleString('en-GB') : 'time pending'
  return `${number} · ${time}${flight.airport ? ` · ${flight.airport}` : ''}`
}

export default async function DepartureTripPackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const [
    { data: departure },
    { data: bookingRows },
    { data: staffRows },
    { data: vehicleRows },
    { data: tasks },
    { data: vouchers },
  ] = await Promise.all([
    admin.from('departures').select('id, start_date, end_date, operation_title, kind, tours ( title_en )').eq('id', id).maybeSingle(),
    admin.from('bookings').select(`
      id, status, clients ( first_name, last_name ),
      booking_travellers (
        id, first_name, last_name, phone, nationality, passport_number, is_rider,
        room_label, room_type, dietary_requirements, allergies, emergency_contact,
        motorbikes ( name ),
        booking_traveller_flights ( direction, airline, flight_number, scheduled_at, airport ),
        traveller_agreements ( status )
      )
    `).eq('departure_id', id).neq('status', 'cancelled').order('created_at'),
    admin.from('departure_staff_assignments').select('tour_staff ( name, role )').eq('departure_id', id),
    admin.from('departure_vehicle_assignments').select('seats_used, vehicles ( name, type, seats )').eq('departure_id', id),
    admin.from('tasks').select('title, type, due_date, priority, is_done').eq('departure_id', id).order('is_done').order('due_date'),
    admin.from('hotel_vouchers').select('voucher_number, hotel_name, check_in, check_out, status').eq('departure_id', id).order('check_in'),
  ])
  if (!departure) notFound()

  const bookings = (bookingRows ?? []) as unknown as Booking[]
  const roster = bookings.flatMap(booking => {
    const client = one(booking.clients)
    const party = `${client?.first_name ?? ''} ${client?.last_name ?? ''}`.trim() || 'Party'
    return (booking.booking_travellers ?? []).map(traveller => ({ ...traveller, party }))
  })
  const tour = one(departure.tours)
  const title = tour?.title_en ?? departure.operation_title ?? 'Private trip'

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 text-foreground print:max-w-none print:px-0 print:py-0">
      <div className="print:hidden">
        <Link href={`/admin/departures/${id}`} className="text-sm text-muted-foreground hover:text-foreground">← Back to Departure</Link>
        <div className="mt-4"><DepartureOperationsNav departureId={id} activeOverride="trip-pack" /></div>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-text">Safari Adventure Riders</p>
          <h1 className="mt-2 text-3xl font-semibold">Trip Operations Pack</h1>
          <p className="mt-1 text-lg font-medium">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(departure.start_date).toLocaleDateString('en-GB')} → {new Date(departure.end_date).toLocaleDateString('en-GB')} · {roster.length} traveller{roster.length === 1 ? '' : 's'}
          </p>
        </div>
        <PrintButton label="Print / Save PDF" />
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Traveller manifest</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead><tr className="bg-muted text-left">
              {['Traveller', 'Party', 'Role', 'Passport', 'Room', 'Bike', 'Phone', 'Agreement'].map(label => <th key={label} className="border border-border px-2 py-2">{label}</th>)}
            </tr></thead>
            <tbody>{roster.map(traveller => {
              const agreement = one(traveller.traveller_agreements)
              return <tr key={traveller.id}>
                <td className="border border-border px-2 py-2 font-medium">{name(traveller)}</td>
                <td className="border border-border px-2 py-2">{traveller.party}</td>
                <td className="border border-border px-2 py-2">{traveller.is_rider === false ? 'Passenger' : 'Rider'}</td>
                <td className="border border-border px-2 py-2">{traveller.passport_number || 'Missing'}</td>
                <td className="border border-border px-2 py-2">{[traveller.room_label, traveller.room_type].filter(Boolean).join(' · ') || 'Unassigned'}</td>
                <td className="border border-border px-2 py-2">{one(traveller.motorbikes)?.name || 'Unassigned'}</td>
                <td className="border border-border px-2 py-2">{traveller.phone || '—'}</td>
                <td className="border border-border px-2 py-2 capitalize">{agreement?.status || 'not issued'}</td>
              </tr>
            })}</tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Flights and transfers</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {roster.map(traveller => (
            <div key={traveller.id} className="rounded-lg border border-border p-3 text-xs break-inside-avoid">
              <p className="font-semibold">{name(traveller)}</p>
              <p className="mt-1"><span className="text-muted-foreground">Arrival:</span> {flightLabel(traveller.booking_traveller_flights?.find(flight => flight.direction === 'arrival'))}</p>
              <p className="mt-1"><span className="text-muted-foreground">Departure:</span> {flightLabel(traveller.booking_traveller_flights?.find(flight => flight.direction === 'departure'))}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-border p-4 break-inside-avoid">
          <h2 className="text-lg font-semibold">Trip team</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(staffRows ?? []).map((row, index) => {
              const staff = one(row.tour_staff)
              return <li key={`${staff?.name ?? 'staff'}-${index}`}>{staff?.name ?? 'Unassigned'}{staff?.role ? ` · ${staff.role}` : ''}</li>
            })}
            {(staffRows ?? []).length === 0 && <li className="text-muted-foreground">No staff assigned</li>}
          </ul>
        </div>
        <div className="rounded-xl border border-border p-4 break-inside-avoid">
          <h2 className="text-lg font-semibold">Vehicles</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(vehicleRows ?? []).map((row, index) => {
              const vehicle = one(row.vehicles)
              return <li key={`${vehicle?.name ?? 'vehicle'}-${index}`}>{vehicle?.name ?? 'Unassigned'}{vehicle?.type ? ` · ${vehicle.type}` : ''} · {row.seats_used} seats planned</li>
            })}
            {(vehicleRows ?? []).length === 0 && <li className="text-muted-foreground">No vehicles assigned</li>}
          </ul>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Open tasks</h2>
          <ul className="space-y-2 text-sm">
            {(tasks ?? []).filter(task => !task.is_done).map((task, index) => (
              <li key={`${task.title}-${index}`} className="rounded-lg border border-border p-3 break-inside-avoid">
                <span className="font-medium">{task.title}</span>
                <span className="ml-2 text-xs capitalize text-muted-foreground">{task.priority}{task.due_date ? ` · due ${new Date(task.due_date).toLocaleDateString('en-GB')}` : ''}</span>
              </li>
            ))}
            {(tasks ?? []).every(task => task.is_done) && <li className="text-muted-foreground">No open tasks</li>}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">Supplier vouchers</h2>
          <ul className="space-y-2 text-sm">
            {(vouchers ?? []).map(voucher => (
              <li key={voucher.voucher_number} className="rounded-lg border border-border p-3 break-inside-avoid">
                <span className="font-medium">{voucher.hotel_name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{voucher.voucher_number} · {voucher.check_in} → {voucher.check_out} · {voucher.status}</span>
              </li>
            ))}
            {(vouchers ?? []).length === 0 && <li className="text-muted-foreground">No vouchers prepared</li>}
          </ul>
        </div>
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-3 text-lg font-semibold">Health, dietary and emergency notes</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {roster.map(traveller => (
            <div key={traveller.id} className="rounded-lg border border-border p-3 text-xs">
              <p className="font-semibold">{name(traveller)}</p>
              <p className="mt-1">Dietary: {traveller.dietary_requirements || 'None recorded'}</p>
              <p>Allergies: {traveller.allergies || 'None recorded'}</p>
              <p>Emergency: {traveller.emergency_contact || 'Missing'}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="border-t border-border pt-4 text-[10px] text-muted-foreground">
        Internal operations document · Generated {new Date().toLocaleString('en-GB')} · Contains confidential traveller information.
      </p>
    </div>
  )
}

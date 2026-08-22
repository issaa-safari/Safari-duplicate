import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { site } from '@/lib/site'
import ManifestClient, { type RosterFlight, type RosterTraveller } from './manifest-client'
import type { Motorbike } from '@/lib/types'
import DepartureOperationsNav from '../operations-nav'

type ManifestAgreement = {
  status: string
  access_token: string
  signed_name: string | null
  signed_at: string | null
}

type ManifestFlight = {
  id: string
  direction: string
  flight_number: string | null
  airline: string | null
  scheduled_at: string | null
  airport: string | null
  notes: string | null
}

type ManifestTraveller = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  nationality: string | null
  passport_number: string | null
  motorbike_id: string | null
  is_rider: boolean | null
  dietary_requirements: string | null
  allergies: string | null
  emergency_contact: string | null
  room_label: string | null
  room_type: string | null
  motorbikes: { name: string | null } | null
  booking_traveller_flights: ManifestFlight[] | null
  traveller_agreements: ManifestAgreement | ManifestAgreement[] | null
}

type ManifestBooking = {
  id: string
  clients: { first_name: string | null; last_name: string | null } | Array<{ first_name: string | null; last_name: string | null }> | null
  booking_travellers: ManifestTraveller[] | null
}

type WorkspaceView = 'travellers' | 'logistics' | 'agreements'

export default async function DepartureManifestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string }>
}) {
  const { id } = await params
  const requestedView = (await searchParams).view
  const view: WorkspaceView = requestedView === 'logistics' || requestedView === 'agreements'
    ? requestedView
    : 'travellers'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  const { data: departure } = await admin
    .from('departures')
    .select('id, start_date, end_date, max_seats, booked_seats, status, kind, operation_title, tours ( title_en )')
    .eq('id', id)
    .single()
  if (!departure) notFound()

  const [{ data: bookings }, { data: bikes }, { count: templateCount }] = await Promise.all([
    admin
      .from('bookings')
      .select(`
        id, status, number_of_travellers,
        clients ( first_name, last_name ),
        booking_travellers (
          id, first_name, last_name, email, phone, nationality, passport_number, date_of_birth,
          motorbike_id, is_rider, dietary_requirements, allergies, emergency_contact, room_label, room_type,
          motorbikes ( id, name, plate_number ),
          booking_traveller_flights ( id, direction, flight_number, airline, scheduled_at, airport, notes, sort_order ),
          traveller_agreements ( id, status, access_token, signed_name, signed_at )
        )
      `)
      .eq('departure_id', id)
      .order('created_at', { ascending: true }),
    admin
      .from('motorbikes')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true }),
    admin
      .from('agreement_templates')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
  ])

  // Flatten bookings → a flat roster, tagging each traveller with the lead
  // client / party they belong to.
  const roster: RosterTraveller[] = []
  for (const b of (bookings ?? []) as unknown as ManifestBooking[]) {
    const client = Array.isArray(b.clients) ? b.clients[0] : b.clients
    const partyName = client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() : null
    for (const t of b.booking_travellers ?? []) {
      const agreement = Array.isArray(t.traveller_agreements) ? t.traveller_agreements[0] : t.traveller_agreements
      const flights: RosterFlight[] = (t.booking_traveller_flights ?? [])
        .map(flight => ({
          id: flight.id,
          direction: flight.direction,
          flightNumber: flight.flight_number,
          airline: flight.airline,
          scheduledAt: flight.scheduled_at,
          airport: flight.airport,
          notes: flight.notes,
        }))
        .sort((a, b2) => (a.scheduledAt ?? '').localeCompare(b2.scheduledAt ?? ''))
      roster.push({
        id: t.id,
        bookingId: b.id,
        partyName: partyName || '—',
        firstName: t.first_name,
        lastName: t.last_name,
        email: t.email,
        phone: t.phone,
        nationality: t.nationality,
        passportNumber: t.passport_number,
        isRider: t.is_rider !== false,
        dietary: t.dietary_requirements,
        allergies: t.allergies,
        emergency: t.emergency_contact,
        roomLabel: t.room_label,
        roomType: t.room_type,
        motorbikeId: t.motorbike_id ?? null,
        motorbikeName: t.motorbikes?.name ?? null,
        flights,
        agreement: agreement
          ? {
              status: agreement.status,
              token: agreement.access_token,
              signedName: agreement.signed_name,
              signedAt: agreement.signed_at,
            }
          : null,
      })
    }
  }

  const tour = Array.isArray(departure.tours) ? departure.tours[0] : departure.tours
  const tripTitle = tour?.title_en ?? departure.operation_title ?? 'Private trip'
  const heading = {
    travellers: {
      title: 'Travellers',
      description: 'Manage the trip roster, rider details, flights, rooms, bikes and document readiness.',
    },
    logistics: {
      title: 'Logistics',
      description: 'Coordinate airport transfers, rooming, flight times and motorbike allocation.',
    },
    agreements: {
      title: 'Traveller agreements',
      description: 'Issue, send and track each traveller agreement from one list.',
    },
  }[view]

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-2 flex items-center gap-4">
        <Link href={`/admin/departures/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Departure
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{heading.title}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {tripTitle} ·{' '}
          {new Date(departure.start_date).toLocaleDateString('en-GB')} →{' '}
          {new Date(departure.end_date).toLocaleDateString('en-GB')}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{heading.description}</p>
      </div>

      <div className="mb-6">
        <DepartureOperationsNav departureId={id} />
      </div>

      <ManifestClient
        view={view}
        departureId={id}
        departureLabel={`${tripTitle} — ${new Date(departure.start_date).toLocaleDateString('en-GB')}`}
        roster={roster}
        motorbikes={(bikes as Motorbike[]) ?? []}
        hasTemplate={(templateCount ?? 0) > 0}
        agreementBaseUrl={`${site.url}/agreement/`}
      />
    </div>
  )
}

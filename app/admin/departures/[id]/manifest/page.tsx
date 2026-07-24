import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { site } from '@/lib/site'
import ManifestClient, { type RosterTraveller } from './manifest-client'
import type { Motorbike } from '@/lib/types'

export default async function DepartureManifestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  const { data: departure } = await admin
    .from('departures')
    .select('id, start_date, end_date, max_seats, booked_seats, status, tours ( title_en )')
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
          motorbike_id, is_rider, dietary_requirements, allergies, emergency_contact,
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
  for (const b of (bookings ?? []) as any[]) {
    const client = b.clients as any
    const partyName = client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() : null
    for (const t of (b.booking_travellers ?? []) as any[]) {
      const agreement = Array.isArray(t.traveller_agreements) ? t.traveller_agreements[0] : t.traveller_agreements
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
        motorbikeId: t.motorbike_id ?? null,
        motorbikeName: t.motorbikes?.name ?? null,
        flights: (t.booking_traveller_flights ?? [])
          .map((f: any) => ({
            id: f.id,
            direction: f.direction,
            flightNumber: f.flight_number,
            airline: f.airline,
            scheduledAt: f.scheduled_at,
            airport: f.airport,
            notes: f.notes,
          }))
          .sort((a: any, b2: any) => (a.scheduledAt ?? '').localeCompare(b2.scheduledAt ?? '')),
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-2 flex items-center gap-4">
        <Link href={`/admin/departures/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Departure
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Departure Manifest</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {(departure as any).tours?.title_en ?? 'Tour'} ·{' '}
          {new Date(departure.start_date).toLocaleDateString('en-GB')} →{' '}
          {new Date(departure.end_date).toLocaleDateString('en-GB')}
        </p>
      </div>

      <ManifestClient
        departureId={id}
        departureLabel={`${(departure as any).tours?.title_en ?? 'Tour'} — ${new Date(departure.start_date).toLocaleDateString('en-GB')}`}
        roster={roster}
        motorbikes={(bikes as Motorbike[]) ?? []}
        hasTemplate={(templateCount ?? 0) > 0}
        agreementBaseUrl={`${site.url}/agreement/`}
      />
    </div>
  )
}

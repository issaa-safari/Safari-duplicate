import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { NextRequest, NextResponse } from 'next/server'
import type { SearchBooking, SearchDeparture, SearchEntity, SearchQuote, SearchRequest } from '@/lib/types'

// PostgREST returns the embedded relation as an object for a to-one join.
type ClientEmbed = { first_name: string | null; last_name: string | null } | null
type RawQuoteRow = { id: string; quote_number: string | null; status: string; clients: ClientEmbed }
type RawRequestRow = { id: string; reference: string | null; stage: string; clients: ClientEmbed }

const clientName = (c: ClientEmbed) =>
  c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() : null

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  try {
    await assertAdminAccess(admin, user.email)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rawQ = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const empty = { quotes: [], clients: [], requests: [], bookings: [], departures: [], tours: [], suppliers: [], accommodations: [] }
  if (rawQ.length < 2) return NextResponse.json(empty)
  if (!/^[\p{L}\p{N}\s@._+-]{2,64}$/u.test(rawQ)) {
    return NextResponse.json(empty)
  }

  // Escape PostgREST filter control characters before embedding in the .or() expression.
  const q = rawQ.replace(/[%_,()*]/g, '\\$&')
  const like = `%${q}%`

  const [
    { data: quotesRaw },
    { data: clients },
    { data: requestsRaw },
    { data: tourRows },
    { data: supplierRows },
    { data: accommodationRows },
    { data: privateDepartureRows },
  ] = await Promise.all([
    admin.from('quotes')
      .select('id, quote_number, status, client_id, clients(first_name, last_name)')
      .or(`quote_number.ilike.${like}`)
      .limit(6),
    admin.from('clients')
      .select('id, first_name, last_name, email')
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`)
      .limit(6),
    admin.from('requests')
      .select('id, reference, stage, client_id, clients(first_name, last_name)')
      .or(`reference.ilike.${like}`)
      .limit(6),
    admin.from('tours')
      .select('id, title_en, type')
      .ilike('title_en', like)
      .limit(6),
    admin.from('suppliers')
      .select('id, name, supplier_type')
      .ilike('name', like)
      .limit(6),
    admin.from('accommodations')
      .select('id, name, type')
      .ilike('name', like)
      .limit(6),
    admin.from('departures')
      .select('id, operation_title, start_date, kind, tours ( title_en )')
      .ilike('operation_title', like)
      .limit(6),
  ])

  const matchingClientIds = (clients ?? []).map(client => client.id)
  const matchingTourIds = (tourRows ?? []).map(tour => tour.id)
  const [{ data: bookingRows }, { data: scheduledDepartureRows }] = await Promise.all([
    matchingClientIds.length > 0
      ? admin.from('bookings')
          .select('id, status, start_date, end_date, clients ( first_name, last_name )')
          .in('client_id', matchingClientIds)
          .order('created_at', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
    matchingTourIds.length > 0
      ? admin.from('departures')
          .select('id, operation_title, start_date, kind, tours ( title_en )')
          .in('tour_id', matchingTourIds)
          .order('start_date', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
  ])

  const quotes: SearchQuote[] = ((quotesRaw ?? []) as unknown as RawQuoteRow[]).map((q) => ({
    id: q.id,
    quote_number: q.quote_number,
    status: q.status,
    client_name: clientName(q.clients),
  }))

  const requests: SearchRequest[] = ((requestsRaw ?? []) as unknown as RawRequestRow[]).map((r) => ({
    id: r.id,
    reference: r.reference,
    stage: r.stage,
    client_name: clientName(r.clients),
  }))

  const bookings: SearchBooking[] = ((bookingRows ?? []) as unknown as Array<{
    id: string
    status: string
    start_date: string | null
    end_date: string | null
    clients: ClientEmbed
  }>).map(booking => ({
    id: booking.id,
    status: booking.status,
    start_date: booking.start_date,
    end_date: booking.end_date,
    client_name: clientName(booking.clients),
  }))

  const departureRows = [...new Map(
    [...(privateDepartureRows ?? []), ...(scheduledDepartureRows ?? [])].map(row => [row.id, row]),
  ).values()]
  const departures: SearchDeparture[] = (departureRows as unknown as Array<{
    id: string
    operation_title: string | null
    start_date: string
    kind: string
    tours: { title_en: string | null } | null
  }>).map(departure => ({
    id: departure.id,
    title: departure.tours?.title_en ?? departure.operation_title ?? 'Private trip',
    start_date: departure.start_date,
    kind: departure.kind,
  }))

  const tours: SearchEntity[] = (tourRows ?? []).map(tour => ({ id: tour.id, name: tour.title_en, detail: tour.type }))
  const suppliers: SearchEntity[] = (supplierRows ?? []).map(supplier => ({ id: supplier.id, name: supplier.name, detail: supplier.supplier_type }))
  const accommodations: SearchEntity[] = (accommodationRows ?? []).map(accommodation => ({ id: accommodation.id, name: accommodation.name, detail: accommodation.type }))

  return NextResponse.json({
    quotes,
    clients: clients ?? [],
    requests,
    bookings,
    departures,
    tours,
    suppliers,
    accommodations,
  })
}

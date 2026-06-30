import { createAdminClient } from '@/lib/supabase/admin'
import { refreshClientTotals } from '@/lib/server/clients'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Turn an accepted quote into a confirmed booking so it shows up in Bookings
// and Finance. Idempotent (one booking per quote). Requires migration group_27.
async function createBookingFromAcceptedQuote(
  admin: SupabaseClient,
  quoteId: string,
  versionId: string,
) {
  // Idempotency — one booking per quote
  const { data: existing } = await admin
    .from('bookings').select('id').eq('quote_id', quoteId).limit(1).maybeSingle()
  if (existing?.id) return

  const { data: quote } = await admin
    .from('quotes').select('client_id, departure_id').eq('id', quoteId).single()

  // Mandatory link: booking must have a client. Guard explicitly so the
  // failure is named (not conflated with a transient DB error) and visible.
  // Once group_28 Tier 2 sets quotes.client_id NOT NULL this branch is unreachable.
  if (!quote?.client_id) {
    console.error(
      '[quote/accept] booking skipped — quote has no client_id',
      { quoteId, versionId },
    )
    return
  }

  const { data: version } = await admin
    .from('quote_versions').select('total_selling_usd').eq('id', versionId).single()
  const { count } = await admin
    .from('quote_travellers').select('id', { count: 'exact', head: true }).eq('quote_version_id', versionId)

  const numTravellers = Math.max(1, count ?? 0)
  const total = Number(version?.total_selling_usd ?? 0)

  const { data: booking } = await admin
    .from('bookings')
    .insert({
      quote_id: quoteId,
      client_id: quote.client_id,
      departure_id: quote.departure_id ?? null,
      number_of_travellers: numTravellers,
      total_price_usd: total,
      status: 'confirmed',
    })
    .select('id')
    .single()
  if (!booking) return

  // Best-effort: finance stub
  try {
    await admin.from('booking_payments').insert({
      booking_id: booking.id, amount_usd: total, status: 'pending', notes: 'Accepted quote',
    })
  } catch { /* finance record is non-critical */ }

  // Best-effort: seat reservation
  if (quote.departure_id) {
    try {
      const { data: dep } = await admin
        .from('departures').select('booked_seats').eq('id', quote.departure_id).single()
      if (dep) {
        await admin.from('departures')
          .update({ booked_seats: (dep.booked_seats ?? 0) + numTravellers })
          .eq('id', quote.departure_id)
      }
    } catch { /* seat reservation is non-critical */ }
  }

  // Best-effort: refresh client totals
  try {
    await refreshClientTotals(admin, quote.client_id)
  } catch { /* totals are a convenience cache */ }
}

export async function POST(req: NextRequest) {
  try {
    const { deliveryId, versionId, quoteId, clientName } = await req.json()

    if (!deliveryId || !versionId || !quoteId || !clientName?.trim()) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Validate delivery is still active
    const { data: delivery } = await admin
      .from('quote_deliveries')
      .select('id, revoked_at, expires_at')
      .eq('id', deliveryId)
      .eq('quote_id', quoteId)
      .single()

    if (!delivery) return NextResponse.json({ error: 'Invalid link.' }, { status: 404 })
    if (delivery.revoked_at) return NextResponse.json({ error: 'This link has been revoked.' }, { status: 410 })
    if (delivery.expires_at && new Date(delivery.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This link has expired.' }, { status: 410 })
    }

    // Check the version isn't already accepted/declined/expired
    const { data: version } = await admin
      .from('quote_versions')
      .select('id, status, quote_id')
      .eq('id', versionId)
      .eq('quote_id', quoteId)
      .single()

    if (!version) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
    if (version.status === 'accepted') {
      return NextResponse.json({ error: 'This quote has already been accepted.' }, { status: 409 })
    }
    if (!['sent', 'viewed', 'ready'].includes(version.status)) {
      return NextResponse.json({ error: 'This quote cannot be accepted.' }, { status: 409 })
    }

    // Check no existing acceptance
    const { data: existing } = await admin
      .from('quote_acceptances')
      .select('id')
      .eq('quote_version_id', versionId)
      .maybeSingle()

    if (existing) return NextResponse.json({ error: 'This quote has already been accepted.' }, { status: 409 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null
    const userAgent = req.headers.get('user-agent') ?? null

    // Insert acceptance record
    const { error: insertError } = await admin.from('quote_acceptances').insert({
      quote_id: quoteId,
      quote_version_id: versionId,
      delivery_id: deliveryId,
      client_name: clientName.trim(),
      terms_accepted: true,
      ip_address: ip,
      user_agent: userAgent,
    })

    if (insertError) throw insertError

    // Update version status
    await admin.from('quote_versions').update({ status: 'accepted' }).eq('id', versionId)

    // Update parent quote status
    await admin.from('quotes').update({ status: 'accepted' }).eq('id', quoteId)

    // Promote the accepted quote into a confirmed booking (best-effort).
    try {
      await createBookingFromAcceptedQuote(admin, quoteId, versionId)
    } catch (e) {
      console.error('[quote/accept] booking creation skipped', e)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[quote/accept]', err)
    return NextResponse.json({ error: err.message ?? 'Server error.' }, { status: 500 })
  }
}

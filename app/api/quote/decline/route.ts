import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, 'quote-decline', 10, 60_000)
  if (limited) return limited

  try {
    const { deliveryId, versionId, quoteId } = await req.json()

    if (!deliveryId || !versionId || !quoteId) {
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

    // Check version can still be declined
    const { data: version } = await admin
      .from('quote_versions')
      .select('id, status, compare_group')
      .eq('id', versionId)
      .eq('quote_id', quoteId)
      .single()

    if (!version) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
    if (version.status === 'declined') return NextResponse.json({ ok: true })
    if (!['sent', 'viewed', 'ready'].includes(version.status)) {
      return NextResponse.json({ error: 'This quote cannot be declined.' }, { status: 409 })
    }

    await admin.from('quote_versions').update({ status: 'declined' }).eq('id', versionId)
    await admin.from('quotes').update({ status: 'declined' }).eq('id', quoteId)

    // Best-effort: if no sibling dual-track version and no other live quote
    // remain on the parent request, advance it to 'not_booked' so it doesn't
    // sit stuck in 'open' forever. Mirrors the accept route's automation.
    try {
      const ALIVE = ['draft', 'ready', 'sent', 'viewed']

      if (version.compare_group) {
        const { count: liveSiblings } = await admin
          .from('quote_versions')
          .select('id', { count: 'exact', head: true })
          .eq('quote_id', quoteId)
          .eq('compare_group', version.compare_group)
          .neq('id', versionId)
          .in('status', ALIVE)
        if (liveSiblings) return NextResponse.json({ ok: true }) // sibling track still pending
      }

      const { data: q } = await admin.from('quotes').select('request_id').eq('id', quoteId).single()
      if (q?.request_id) {
        const { count: liveOtherQuotes } = await admin
          .from('quotes')
          .select('id', { count: 'exact', head: true })
          .eq('request_id', q.request_id)
          .neq('id', quoteId)
          .in('status', ['draft', 'ready', 'sent', 'viewed', 'accepted'])
        if (!liveOtherQuotes) {
          await admin.from('requests').update({ stage: 'not_booked' }).eq('id', q.request_id)
        }
      }
    } catch (e) {
      console.error('[quote/decline] request stage advance skipped', e)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[quote/decline]', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

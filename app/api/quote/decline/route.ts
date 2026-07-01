import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
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
      .select('id, status')
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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[quote/decline]', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

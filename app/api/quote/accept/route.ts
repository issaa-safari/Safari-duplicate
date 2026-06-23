import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

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

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[quote/accept]', err)
    return NextResponse.json({ error: err.message ?? 'Server error.' }, { status: 500 })
  }
}

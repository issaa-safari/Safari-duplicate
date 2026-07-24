import { createAdminClient } from '@/lib/supabase/admin'
import { enforceRateLimit } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, 'agreement-sign', 10, 60_000)
  if (limited) return limited

  try {
    const { token, signedName } = await req.json()
    if (!token || !signedName?.trim()) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: agreement } = await admin
      .from('traveller_agreements')
      .select('id, status')
      .eq('access_token', token)
      .maybeSingle()

    if (!agreement) return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 404 })
    if (agreement.status === 'signed') {
      return NextResponse.json({ error: 'This agreement has already been signed.' }, { status: 409 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null
    const userAgent = req.headers.get('user-agent') ?? null

    const { error } = await admin
      .from('traveller_agreements')
      .update({
        status: 'signed',
        signed_name: signedName.trim(),
        terms_accepted: true,
        signed_at: new Date().toISOString(),
        ip_address: ip,
        user_agent: userAgent,
      })
      .eq('id', agreement.id)
      .eq('status', 'pending') // guard against a concurrent double-sign

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[agreement/sign]', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}

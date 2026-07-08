import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { assertValidClientIdentity } from '@/lib/server/validate-client'

// Creates a CRM client inline (e.g. from the new-quote wizard's client
// dropdown) so the admin never has to leave the flow to add one. If the
// email already belongs to a client, that client is returned instead of
// creating a duplicate.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { firstName, lastName, email, phone, whatsapp, country, language } = await request.json()

  const first = (firstName || '').trim()
  const last = (lastName || '').trim()
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() || null : null

  try {
    assertValidClientIdentity({ firstName: first, lastName: last, email: cleanEmail })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Invalid client details' }, { status: 400 })
  }

  const lang = language === 'ar' ? 'ar' : 'en'

  const admin = createAdminClient()
  try {
    await assertAdminAccess(admin, user.email)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (cleanEmail) {
    const { data: existing } = await admin
      .from('clients')
      .select('id, first_name, last_name, email')
      .ilike('email', cleanEmail)
      .limit(1)
      .maybeSingle()
    if (existing?.id) {
      return NextResponse.json({ item: existing, existing: true })
    }
  }

  const { data, error } = await admin
    .from('clients')
    .insert({
      first_name: first,
      last_name: last,
      email: cleanEmail,
      phone: (phone || '').trim() || null,
      whatsapp: (whatsapp || '').trim() || null,
      country: (country || '').trim() || null,
      language: lang,
      preferred_language: lang,
      source: 'admin',
    })
    .select('id, first_name, last_name, email')
    .single()

  if (error || !data) {
    console.error('[create-client]', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
  return NextResponse.json({ item: data, existing: false })
}

import type { SupabaseClient } from '@supabase/supabase-js'

// Find a CRM client by normalised email, creating one if absent.
// Throws on hard DB failure — callers that require a client must not swallow this.
export async function findOrCreateClientByEmail(
  admin: SupabaseClient,
  details: { email?: string | null; first_name?: string | null; last_name?: string | null; phone?: string | null },
): Promise<string> {
  const email = (details.email ?? '').trim().toLowerCase()
  if (!email) throw new Error('Client email is required')

  const { data: existing, error: lookupError } = await admin
    .from('clients')
    .select('id, first_name, last_name, phone')
    .ilike('email', email)
    .limit(1)
    .maybeSingle()

  if (lookupError) throw new Error(`Client lookup failed: ${lookupError.message}`)

  if (existing?.id) {
    // Fill in any blank fields the new call can supply
    const patch: Record<string, string> = {}
    if (!existing.first_name && details.first_name) patch.first_name = details.first_name
    if (!existing.last_name && details.last_name) patch.last_name = details.last_name
    if (!existing.phone && details.phone) patch.phone = details.phone
    if (Object.keys(patch).length > 0) {
      await admin.from('clients').update(patch).eq('id', existing.id)
    }
    return existing.id
  }

  const { data: created, error: insertError } = await admin
    .from('clients')
    .insert({
      email,
      first_name: details.first_name ?? '',
      last_name: details.last_name ?? '',
      phone: details.phone ?? null,
      source: 'website',
    })
    .select('id')
    .single()

  if (insertError || !created) throw new Error(`Client creation failed: ${insertError?.message ?? 'no row returned'}`)
  return created.id
}

// Best-effort refresh of a client's rolled-up booking totals.
export async function refreshClientTotals(admin: SupabaseClient, clientId: string): Promise<void> {
  try {
    const { data: rows } = await admin
      .from('bookings')
      .select('total_price_usd, status')
      .eq('client_id', clientId)
    const active = (rows ?? []).filter((b: { status: string }) => b.status !== 'cancelled')
    const totalBookings = active.length
    const totalSpent = active.reduce((s: number, b: { total_price_usd: number | null }) => s + Number(b.total_price_usd ?? 0), 0)
    await admin
      .from('clients')
      .update({ total_bookings: totalBookings, total_spent_usd: totalSpent })
      .eq('id', clientId)
  } catch {
    // ignore — totals are a denormalised convenience, not critical
  }
}

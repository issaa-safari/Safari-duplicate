'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { resolveTripRef } from '@/lib/server/accounting'
import type { Service } from '@/lib/types'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

function revalidateTrip(quoteId: string | null, bookingId: string | null) {
  revalidatePath('/admin/finance/receipts')
  revalidatePath('/admin/finance/invoices')
  if (quoteId) revalidatePath(`/admin/quotes/${quoteId}`)
  if (bookingId) revalidatePath(`/admin/bookings/${bookingId}`)
}

/**
 * Sell an add-on to a trip — a visa, insurance, whatever the catalogue holds.
 *
 * Name and price are copied onto the attachment rather than referenced, so
 * re-pricing the catalogue never re-prices a trip that was already sold. The
 * quantity defaults to the traveller count for a per-person service, which is
 * what the operator means nine times in ten.
 */
export async function addTripService(formData: FormData) {
  const { user, admin } = await authGuard()

  const quoteId = (formData.get('quoteId') as string) || null
  const bookingId = (formData.get('bookingId') as string) || null
  const serviceId = formData.get('serviceId') as string
  if (!quoteId && !bookingId) throw new Error('An add-on must belong to a quote or a booking.')
  if (!serviceId) throw new Error('Choose a service.')

  const quantity = parseFloat((formData.get('quantity') as string) || '1')
  if (isNaN(quantity) || quantity <= 0) throw new Error('Quantity must be more than zero.')

  const priceRaw = (formData.get('unitPrice') as string) || ''
  const unitPrice = priceRaw.trim() === '' ? null : parseFloat(priceRaw)
  if (unitPrice !== null && (isNaN(unitPrice) || unitPrice < 0)) {
    throw new Error('A price cannot be negative.')
  }

  const { data: service } = await admin
    .from('services')
    .select('id, name_en, name_ar, default_price_usd, is_active')
    .eq('id', serviceId)
    .maybeSingle()

  if (!service) throw new Error('Service not found.')
  if (!(service as Service).is_active) {
    throw new Error('That service has been retired. Reactivate it in Content → Add-on Services first.')
  }

  const ref = await resolveTripRef(admin, { quoteId, bookingId })

  const { error } = await admin.from('trip_services').insert({
    quote_id: ref.quoteId,
    booking_id: ref.bookingId,
    service_id: service.id,
    name_en: service.name_en,
    name_ar: service.name_ar,
    unit_price_usd: unitPrice ?? Number(service.default_price_usd),
    quantity,
    notes: ((formData.get('notes') as string) || '').trim() || null,
    created_by: user.id,
  })

  if (error) throw new Error(error.message)
  revalidateTrip(ref.quoteId, ref.bookingId)
}

/**
 * Take an add-on back off a trip.
 *
 * Only ever a correction: an invoice that already charged for it keeps its line,
 * because invoice_lines.trip_service_id is `on delete set null` and an issued
 * invoice cannot be edited at all.
 */
export async function removeTripService(formData: FormData) {
  const { admin } = await authGuard()
  const id = formData.get('id') as string
  if (!id) throw new Error('Missing add-on.')

  const { data: existing } = await admin
    .from('trip_services')
    .select('quote_id, booking_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await admin.from('trip_services').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidateTrip(
    (existing?.quote_id as string | null) ?? null,
    (existing?.booking_id as string | null) ?? null
  )
}

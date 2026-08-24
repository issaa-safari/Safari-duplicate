'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { logActivity } from '@/lib/server/audit'
import { safeAction, type ActionResult } from '@/lib/server/action-result'
import { adjustDepartureSeats as adjustSeats } from '@/lib/server/departures'

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

const EDITABLE_STATUSES = ['pending', 'confirmed', 'completed'] as const
type EditableStatus = (typeof EDITABLE_STATUSES)[number]

/**
 * Set or clear a booking's own trip dates.
 *
 * Only for a booking with no departure. A seat on a scheduled departure takes
 * its dates from that departure (lib/trip-dates.ts), so writing them here would
 * be writing a value nothing reads — worse, a value someone would later believe.
 *
 * This exists because dates are frequently not agreed when the booking is
 * taken: an enquiry becomes a confirmed private trip first, and the calendar
 * follows a week later.
 */
export async function updateBookingDates(formData: FormData) {
  const { admin } = await authGuard()

  const id = formData.get('id') as string
  if (!id) throw new Error('Missing booking.')

  const startDate = (formData.get('startDate') as string)?.trim() || null
  const endDate = (formData.get('endDate') as string)?.trim() || null
  if (startDate && endDate && endDate < startDate) {
    throw new Error('The end date is before the start date.')
  }

  const { data: booking } = await admin
    .from('bookings')
    .select('id, departure_id')
    .eq('id', id)
    .maybeSingle()

  if (!booking) throw new Error('Booking not found.')
  if (booking.departure_id) {
    throw new Error('This booking is on a scheduled departure — change the dates on the departure instead.')
  }

  const { error } = await admin
    .from('bookings')
    .update({ start_date: startDate, end_date: endDate })
    .eq('id', id)

  if (error) throw new Error(error.message)

  revalidatePath(`/admin/bookings/${id}`)
  revalidatePath('/admin/bookings')
  revalidatePath('/dashboard')
}

function revalidateBooking(id: string) {
  revalidatePath(`/admin/bookings/${id}`)
  revalidatePath('/admin/bookings')
  revalidatePath('/admin/departures')
  revalidatePath('/dashboard')
}

/**
 * Edit a booking's status, traveller count and price. Deliberately excludes
 * `cancelled` as a target status — cancelBooking below owns that transition,
 * so there is exactly one place seats get released and exactly one place a
 * cancellation confirmation is shown.
 *
 * Returns `{ error }` rather than throwing: a thrown message is redacted in
 * production builds, which is the bug the payments work uncovered.
 */
const updateBookingImpl = safeAction(async (formData: FormData) => {
  const { user, admin } = await authGuard()

  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('Missing booking.')

  const status = String(formData.get('status') ?? '')
  if (!EDITABLE_STATUSES.includes(status as EditableStatus)) {
    throw new Error('Invalid status.')
  }

  const numberOfTravellers = parseInt(String(formData.get('numberOfTravellers') ?? ''), 10)
  if (isNaN(numberOfTravellers) || numberOfTravellers <= 0) {
    throw new Error('Traveller count must be at least 1.')
  }

  const totalPriceUsd = parseFloat(String(formData.get('totalPriceUsd') ?? ''))
  if (isNaN(totalPriceUsd) || totalPriceUsd < 0) throw new Error('Enter a valid total price.')

  const { data: booking } = await admin
    .from('bookings')
    .select('id, departure_id, status, number_of_travellers, departures(security_deposit_usd)')
    .eq('id', id)
    .maybeSingle()
  if (!booking) throw new Error('Booking not found.')

  // Seats only move on a real transition. Reactivating a cancelled booking
  // reserves the new traveller count from scratch; otherwise only the delta
  // in headcount moves, and a status change between two live states (e.g.
  // pending → confirmed) touches nothing.
  let seatDelta = 0
  if (booking.departure_id) {
    const wasCancelled = booking.status === 'cancelled'
    seatDelta = wasCancelled ? numberOfTravellers : numberOfTravellers - booking.number_of_travellers
    const { error: seatError } = await adjustSeats(admin, booking.departure_id, seatDelta)
    if (seatError) throw new Error(seatError)
  }

  // deposit_due_usd is snapshotted from the departure's per-seat rate, same as
  // at booking creation — it has to be recomputed here too, or raising the
  // traveller count silently leaves the security-deposit panel's "Expected"
  // figure pinned to the old headcount.
  const update: Record<string, unknown> = {
    status,
    number_of_travellers: numberOfTravellers,
    total_price_usd: totalPriceUsd,
  }
  if (booking.departure_id) {
    const depositPerSeat = Number(
      (booking.departures as { security_deposit_usd?: number } | null)?.security_deposit_usd ?? 0
    )
    update.deposit_due_usd = depositPerSeat * numberOfTravellers
  }

  const { error } = await admin.from('bookings').update(update).eq('id', id)
  if (error) {
    // The seat count already moved; the booking row didn't. Undo the seat
    // write rather than leaving booked_seats desynced from what this booking
    // actually holds — best-effort, since we're already in a failure path.
    if (booking.departure_id && seatDelta !== 0) {
      await adjustSeats(admin, booking.departure_id, -seatDelta).catch(() => {})
    }
    throw new Error(error.message)
  }

  await logActivity(admin, {
    entityType: 'booking',
    entityId: id,
    action: 'booking_updated',
    summary: `Updated booking — ${status}, ${numberOfTravellers} traveller${numberOfTravellers !== 1 ? 's' : ''}, $${totalPriceUsd.toFixed(2)}`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { status, numberOfTravellers, totalPriceUsd },
  })

  revalidateBooking(id)
})

export async function updateBooking(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return updateBookingImpl(formData)
}

const LEGACY_VALUE_ERRORS: Record<string, string> = {
  TRIP_VALUE_POSITIVE_REQUIRED: 'Enter a trip value greater than zero.',
  TRIP_VALUE_BOOKING_NOT_FOUND: 'Booking not found.',
  TRIP_VALUE_LEGACY_CUSTOM_REQUIRED: 'This correction is only available for a legacy accepted custom safari.',
  TRIP_VALUE_ACCEPTED_QUOTE_REQUIRED: 'The booking is not linked to an accepted proposal.',
  TRIP_VALUE_VERSION_NOT_FOUND: 'The accepted proposal version could not be found.',
  TRIP_VALUE_BOOKING_CHANGED: 'The booking changed while it was being corrected. Refresh and try again.',
  TRIP_VALUE_CORRECTION_NOT_REQUIRED: 'This trip already has a confirmed commercial value.',
}

const correctLegacyTripValueImpl = safeAction(async (formData: FormData) => {
  const { user, admin } = await authGuard()
  const bookingId = String(formData.get('id') ?? '')
  const totalPriceUsd = Number(formData.get('totalPriceUsd'))

  if (!bookingId) throw new Error('Missing booking.')
  if (!Number.isFinite(totalPriceUsd) || totalPriceUsd <= 0) {
    throw new Error('Enter a trip value greater than zero.')
  }

  const { data, error } = await admin.rpc('correct_legacy_trip_value_atomic', {
    p_booking_id: bookingId,
    p_total_price_usd: totalPriceUsd,
  })
  if (error) {
    const code = Object.keys(LEGACY_VALUE_ERRORS).find(key => error.message.includes(key))
    throw new Error(code ? LEGACY_VALUE_ERRORS[code] : error.message)
  }

  const result = data as {
    quoteId?: string
    departureId?: string
    totalPriceUsd?: number
    securityDepositDueUsd?: number
  } | null

  await logActivity(admin, {
    entityType: 'booking',
    entityId: bookingId,
    action: 'legacy_trip_value_corrected',
    summary: `Corrected legacy accepted-trip value to $${totalPriceUsd.toFixed(2)}`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { totalPriceUsd, quoteId: result?.quoteId, departureId: result?.departureId },
  })

  revalidateBooking(bookingId)
  revalidatePath('/admin/quotes')
  revalidatePath('/admin/finance')
  revalidatePath('/admin/finance/receipts')
  if (result?.quoteId) revalidatePath(`/admin/quotes/${result.quoteId}`)
  if (result?.departureId) {
    revalidatePath(`/admin/departures/${result.departureId}`)
    revalidatePath(`/admin/departures/${result.departureId}/tasks`)
  }
})

export async function correctLegacyTripValue(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return correctLegacyTripValueImpl(formData)
}

/**
 * Cancel a booking and release its seats. The one and only place a booking
 * moves into `cancelled` — see the note on updateBooking above.
 *
 * Does not block on outstanding payments or held security deposits: a refund
 * is its own ledger row and a deposit is returned through its own flow, not
 * something this action should silently attempt on someone's behalf. The UI
 * warns about both before calling this.
 */
const cancelBookingImpl = safeAction(async (formData: FormData) => {
  const { user, admin } = await authGuard()

  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('Missing booking.')

  const { data: booking } = await admin
    .from('bookings')
    .select('id, departure_id, status, number_of_travellers')
    .eq('id', id)
    .maybeSingle()
  if (!booking) throw new Error('Booking not found.')
  if (booking.status === 'cancelled') throw new Error('This booking is already cancelled.')

  if (booking.departure_id) {
    const { error: seatError } = await adjustSeats(admin, booking.departure_id, -booking.number_of_travellers)
    if (seatError) throw new Error(seatError)
  }

  const { error } = await admin.from('bookings').update({ status: 'cancelled' }).eq('id', id)
  if (error) {
    // Seats were already released; the booking still shows as active. Put the
    // seats back rather than leaving booked_seats desynced from what this
    // booking actually holds — best-effort, since we're already in a failure path.
    if (booking.departure_id) {
      await adjustSeats(admin, booking.departure_id, booking.number_of_travellers).catch(() => {})
    }
    throw new Error(error.message)
  }

  await logActivity(admin, {
    entityType: 'booking',
    entityId: id,
    action: 'booking_cancelled',
    summary: booking.departure_id
      ? `Cancelled booking, freed ${booking.number_of_travellers} seat${booking.number_of_travellers !== 1 ? 's' : ''}`
      : 'Cancelled booking',
    actorId: user.id,
    actorEmail: user.email ?? null,
  })

  revalidateBooking(id)
})

export async function cancelBooking(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return cancelBookingImpl(formData)
}

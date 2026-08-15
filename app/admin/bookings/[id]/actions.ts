'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { logActivity } from '@/lib/server/audit'
import { safeAction, type ActionResult } from '@/lib/server/action-result'

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
 * Reserve or release seats on a departure with the same optimistic
 * compare-and-swap `createManualBooking` uses (app/admin/bookings/new/actions.ts):
 * read the current count, write it back with a delta, and let the `.eq` guard
 * reject the write if someone else moved it first. A positive delta reserves,
 * negative releases; a reservation that would oversell is refused before the
 * write is attempted.
 */
async function adjustSeats(
  admin: SupabaseClient,
  departureId: string,
  delta: number
): Promise<{ error: string | null }> {
  if (delta === 0) return { error: null }

  const { data: departure } = await admin
    .from('departures')
    .select('max_seats, booked_seats')
    .eq('id', departureId)
    .maybeSingle()
  if (!departure) return { error: 'Departure not found.' }

  const nextBooked = departure.booked_seats + delta
  if (delta > 0 && nextBooked > departure.max_seats) {
    return { error: 'Not enough seats left on this departure.' }
  }

  const { data: updated, error } = await admin
    .from('departures')
    .update({ booked_seats: Math.max(0, nextBooked) })
    .eq('id', departureId)
    .eq('booked_seats', departure.booked_seats)
    .select('id')
  if (error) return { error: error.message }
  if (!updated || updated.length === 0) {
    return { error: 'Seats just changed — please refresh and try again.' }
  }
  return { error: null }
}

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
    .select('id, departure_id, status, number_of_travellers')
    .eq('id', id)
    .maybeSingle()
  if (!booking) throw new Error('Booking not found.')

  // Seats only move on a real transition. Reactivating a cancelled booking
  // reserves the new traveller count from scratch; otherwise only the delta
  // in headcount moves, and a status change between two live states (e.g.
  // pending → confirmed) touches nothing.
  if (booking.departure_id) {
    const wasCancelled = booking.status === 'cancelled'
    const delta = wasCancelled ? numberOfTravellers : numberOfTravellers - booking.number_of_travellers
    const { error: seatError } = await adjustSeats(admin, booking.departure_id, delta)
    if (seatError) throw new Error(seatError)
  }

  const { error } = await admin
    .from('bookings')
    .update({ status, number_of_travellers: numberOfTravellers, total_price_usd: totalPriceUsd })
    .eq('id', id)
  if (error) throw new Error(error.message)

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
  if (error) throw new Error(error.message)

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

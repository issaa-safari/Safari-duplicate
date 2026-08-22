// Shared departure-booking pipeline.
//
// Both public booking endpoints call the same service-role-only PostgreSQL RPC.
// The RPC owns client/request/booking/traveller creation, seat allocation and
// booking-link usage in one transaction. Email is deliberately post-commit.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail, notifyAdmin, emailShell, detailRows, escapeHtml } from '@/lib/email'
import { site } from '@/lib/site'
import type { DepartureBookingTransactionResult } from '@/lib/types'

export interface IncomingTraveller {
  firstName?: string
  lastName?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  dateOfBirth?: string
  date_of_birth?: string
  nationality?: string
  passportNumber?: string
  passport_number?: string
}

export interface CreateBookingInput {
  travellers: IncomingTraveller[]
  userId?: string | null
  source?: string
  /** Falls back to whichever room type the departure actually prices when the requested one isn't offered. */
  roomType?: 'sharing' | 'single'
  /** Present only for token-based bookings; validated and incremented inside the transaction. */
  bookingLinkId?: string | null
}

export type CreateBookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; status: number; error: string }

const BOOKING_ERRORS: Record<string, { status: number; message: string }> = {
  BOOKING_DEPARTURE_REQUIRED: { status: 400, message: 'Departure is required.' },
  BOOKING_INVALID_TRAVELLERS: { status: 400, message: 'Traveller details are invalid.' },
  BOOKING_INVALID_GROUP_SIZE: { status: 400, message: 'Enter between 1 and 50 travellers.' },
  BOOKING_INVALID_ROOM_TYPE: { status: 400, message: 'Choose a valid room type.' },
  BOOKING_EMAIL_REQUIRED: { status: 400, message: 'The lead traveller email is required.' },
  BOOKING_EMAIL_INVALID: { status: 400, message: 'Enter a valid lead traveller email.' },
  BOOKING_PRICE_MISSING: { status: 409, message: 'This departure has no price configured.' },
  BOOKING_DEPARTURE_NOT_FOUND: { status: 404, message: 'Departure not found.' },
  BOOKING_DEPARTURE_UNAVAILABLE: { status: 409, message: 'This departure is no longer available.' },
  BOOKING_NOT_ENOUGH_SEATS: {
    status: 409,
    message: 'There are not enough places left for this group size.',
  },
  BOOKING_LINK_INVALID: { status: 404, message: 'Invalid booking link.' },
  BOOKING_LINK_DISABLED: { status: 410, message: 'This booking link has been disabled.' },
  BOOKING_LINK_EXPIRED: { status: 410, message: 'This booking link has expired.' },
  BOOKING_LINK_LIMIT_REACHED: { status: 410, message: 'This booking link has reached its limit.' },
}

export function mapDepartureBookingError(error: unknown): { status: number; error: string } {
  const raw = typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message)
    : String(error ?? '')
  const code = Object.keys(BOOKING_ERRORS).find(key => raw.includes(key))
  if (code) {
    const mapped = BOOKING_ERRORS[code]
    return { status: mapped.status, error: mapped.message }
  }
  return { status: 500, error: 'Failed to create booking.' }
}

function parseRpcResult(value: unknown): DepartureBookingTransactionResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (typeof row.bookingId !== 'string') return null
  return {
    bookingId: row.bookingId,
    clientId: String(row.clientId ?? ''),
    requestId: String(row.requestId ?? ''),
    groupSize: Number(row.groupSize ?? 0),
    totalPriceUsd: Number(row.totalPriceUsd ?? 0),
    depositDueUsd: Number(row.depositDueUsd ?? 0),
    roomType: row.roomType === 'single' ? 'single' : 'sharing',
  }
}

export async function createDepartureBooking(
  admin: SupabaseClient,
  departureId: string,
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const { travellers, userId, source, roomType, bookingLinkId } = input

  if (!departureId || !Array.isArray(travellers) || travellers.length === 0) {
    return { ok: false, status: 400, error: 'Missing required fields.' }
  }

  const { data, error } = await admin.rpc('create_departure_booking_atomic', {
    p_departure_id: departureId,
    p_travellers: travellers,
    p_user_id: userId ?? null,
    p_source: source ?? 'website',
    p_room_type: roomType ?? 'sharing',
    p_booking_link_id: bookingLinkId ?? null,
  })

  if (error) {
    console.error('[book] atomic booking failed', error)
    const mapped = mapDepartureBookingError(error)
    return { ok: false, ...mapped }
  }

  const booking = parseRpcResult(data)
  if (!booking) {
    console.error('[book] atomic booking returned an invalid payload', data)
    return { ok: false, status: 500, error: 'Failed to create booking.' }
  }

  const lead = travellers[0]
  const leadName = `${lead?.firstName ?? lead?.first_name ?? ''} ${lead?.lastName ?? lead?.last_name ?? ''}`.trim()
  const bookingRows = detailRows([
    ['Lead traveller', leadName],
    ['Email', lead?.email],
    ['Phone', lead?.phone],
    ['Travellers', booking.groupSize],
    ['Trip total (USD)', booking.totalPriceUsd],
    ['Refundable security deposit (USD)', booking.depositDueUsd > 0 ? booking.depositDueUsd : null],
    ['Booking ID', booking.bookingId],
  ])

  // Notifications are post-commit and best-effort. The booking remains valid if
  // the mail provider is temporarily unavailable.
  await notifyAdmin(
    `New booking — ${leadName || lead?.email || 'website'} (${booking.groupSize} traveller${booking.groupSize > 1 ? 's' : ''})`,
    emailShell(
      'New booking',
      bookingRows +
        `<p style="margin:16px 0 0;font-size:14px"><a href="${site.url}/admin/bookings/${booking.bookingId}">Open in admin</a></p>`,
    ),
    lead?.email,
  )

  if (lead?.email) {
    const depositNote = booking.depositDueUsd > 0
      ? `<p style="margin:0 0 16px;font-size:14px">This trip carries a refundable security deposit of $${booking.depositDueUsd.toLocaleString()}, held against damage to the bike and returned in full at the end of the trip.</p>`
      : ''
    await sendEmail({
      to: lead.email,
      subject: `Your booking with ${site.name} is confirmed`,
      html: emailShell(
        'Booking confirmed 🎉',
        `<p style="margin:0 0 16px;font-size:14px">Thank you${leadName ? `, ${escapeHtml(leadName)}` : ''}! Your booking is confirmed. Our team will contact you shortly with payment and preparation details.</p>` +
          bookingRows +
          depositNote +
          `<p style="margin:16px 0 0;font-size:14px">Questions? Reply to this email or WhatsApp us at ${site.phoneDisplay}.</p>`,
      ),
      replyTo: site.email,
    })
  }

  return { ok: true, bookingId: booking.bookingId }
}

import type { SupabaseClient } from '@supabase/supabase-js'
import type { QuoteAcceptanceTransactionResult } from '@/lib/types'

export type AcceptQuoteInput = {
  quoteId: string
  versionId: string
  deliveryId?: string | null
  clientName?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  isAdmin?: boolean
}

const QUOTE_ACCEPTANCE_ERRORS: Record<string, { status: number; message: string }> = {
  QUOTE_REQUIRED_FIELDS: { status: 400, message: 'Missing required fields.' },
  QUOTE_CLIENT_REQUIRED: { status: 409, message: 'Attach a client before accepting this quote.' },
  QUOTE_CLIENT_NOT_FOUND: { status: 409, message: 'The quote client could not be found.' },
  QUOTE_DELIVERY_REQUIRED: { status: 400, message: 'A valid quote link is required.' },
  QUOTE_NOT_FOUND: { status: 404, message: 'Quote not found.' },
  QUOTE_VERSION_NOT_FOUND: { status: 404, message: 'Quote version not found.' },
  QUOTE_LINK_INVALID: { status: 404, message: 'Invalid quote link.' },
  QUOTE_LINK_REVOKED: { status: 410, message: 'This quote link has been revoked.' },
  QUOTE_LINK_EXPIRED: { status: 410, message: 'This quote link has expired.' },
  QUOTE_EXPIRED: { status: 410, message: 'This quote has expired.' },
  QUOTE_ALREADY_ACCEPTED: { status: 409, message: 'This quote has already been accepted.' },
  QUOTE_CANNOT_ACCEPT: { status: 409, message: 'This quote cannot be accepted.' },
  QUOTE_ITINERARY_REQUIRED: {
    status: 409,
    message: 'Build the day-by-day itinerary before accepting this quote.',
  },
  QUOTE_DATES_REQUIRED: {
    status: 409,
    message: 'Add complete travel dates before accepting this custom proposal.',
  },
  QUOTE_DATES_INVALID: {
    status: 409,
    message: 'The proposal end date must not be before its start date.',
  },
  QUOTE_POSITIVE_PRICE_REQUIRED: {
    status: 409,
    message: 'Complete and approve a positive selling price before accepting this proposal.',
  },
  QUOTE_BOOKING_ALREADY_EXISTS: {
    status: 409,
    message: 'This quote already has a booking and requires operator review.',
  },
  QUOTE_DEPARTURE_NOT_FOUND: { status: 409, message: 'The linked departure could not be found.' },
  QUOTE_DEPARTURE_UNAVAILABLE: { status: 409, message: 'The linked departure is no longer available.' },
  QUOTE_NOT_ENOUGH_SEATS: {
    status: 409,
    message: 'The linked departure no longer has enough places for this group.',
  },
}

export function mapQuoteAcceptanceError(error: unknown): { status: number; error: string } {
  const raw = typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message)
    : String(error ?? '')
  const code = Object.keys(QUOTE_ACCEPTANCE_ERRORS).find(key => raw.includes(key))
  if (code) {
    const mapped = QUOTE_ACCEPTANCE_ERRORS[code]
    return { status: mapped.status, error: mapped.message }
  }
  return { status: 500, error: 'Could not accept this quote.' }
}

function parseResult(value: unknown): QuoteAcceptanceTransactionResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (
    typeof row.acceptanceId !== 'string'
    || typeof row.bookingId !== 'string'
    || typeof row.departureId !== 'string'
  ) return null
  return {
    acceptanceId: row.acceptanceId,
    bookingId: row.bookingId,
    clientId: String(row.clientId ?? ''),
    departureId: row.departureId,
    createdOperationalTrip: row.createdOperationalTrip === true,
    groupSize: Number(row.groupSize ?? 0),
    totalPriceUsd: Number(row.totalPriceUsd ?? 0),
    depositDueUsd: Number(row.depositDueUsd ?? 0),
  }
}

/**
 * Accept a quote and create its booking as one database transaction.
 * Public and admin callers share this exact operation; caller authorization is
 * performed before this service-role-only RPC is invoked.
 */
export async function acceptQuoteAtomically(
  admin: SupabaseClient,
  input: AcceptQuoteInput,
): Promise<QuoteAcceptanceTransactionResult> {
  const { data, error } = await admin.rpc('accept_quote_atomic', {
    p_quote_id: input.quoteId,
    p_version_id: input.versionId,
    p_delivery_id: input.deliveryId ?? null,
    p_client_name: input.clientName ?? null,
    p_ip_address: input.ipAddress ?? null,
    p_user_agent: input.userAgent ?? null,
    p_is_admin: input.isAdmin ?? false,
  })

  if (error) throw error
  const result = parseResult(data)
  if (!result) throw new Error('QUOTE_INVALID_RPC_RESPONSE')
  return result
}

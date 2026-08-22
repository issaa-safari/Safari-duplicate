import type { SupabaseClient } from '@supabase/supabase-js'
import type { ManualBookingTransactionResult } from '@/lib/types'

export type ManualBookingTraveller = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  nationality?: string
  passportNumber?: string
  dateOfBirth?: string
  isRider?: boolean
  emergencyContact?: string
}

export type ManualBookingInput = {
  departureId: string | null
  requestId: string | null
  clientId: string | null
  startDate: string | null
  endDate: string | null
  travellerCount: number
  totalPriceUsd: number
  status: 'pending' | 'confirmed'
  travellers: ManualBookingTraveller[]
  depositUsd: number
  depositMethod: string | null
  depositReference: string | null
  createdBy: string
}

const MANUAL_BOOKING_ERRORS: Record<string, string> = {
  MANUAL_BOOKING_INVALID_STATUS: 'Choose a valid booking status.',
  MANUAL_BOOKING_INVALID_TOTAL: 'Enter a valid total price.',
  MANUAL_BOOKING_INVALID_DEPOSIT: 'Deposit cannot exceed the total price.',
  MANUAL_BOOKING_INVALID_DATES: 'The end date is before the start date.',
  MANUAL_BOOKING_INVALID_TRAVELLERS: 'Could not read traveller details.',
  MANUAL_BOOKING_INVALID_PAYMENT_METHOD: 'Choose a valid deposit payment method.',
  MANUAL_BOOKING_INVALID_GROUP_SIZE: 'Enter a valid traveller count.',
  MANUAL_BOOKING_REQUEST_NOT_FOUND: 'Request not found.',
  MANUAL_BOOKING_CLIENT_NOT_FOUND: 'Client not found.',
  MANUAL_BOOKING_DEPARTURE_NOT_FOUND: 'Departure not found.',
  MANUAL_BOOKING_DEPARTURE_UNAVAILABLE: 'This departure is no longer available.',
  MANUAL_BOOKING_NOT_ENOUGH_SEATS: 'Not enough seats are left on this departure.',
  MANUAL_BOOKING_EMAIL_INVALID: 'Enter a valid lead traveller email.',
  MANUAL_BOOKING_IDENTITY_REQUIRED:
    'Choose a departure, request or client, or add at least one traveller.',
}

export function mapManualBookingError(error: unknown): string {
  const raw = typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message)
    : String(error ?? '')
  const code = Object.keys(MANUAL_BOOKING_ERRORS).find(key => raw.includes(key))
  return code ? MANUAL_BOOKING_ERRORS[code] : 'Failed to create the booking.'
}

export async function createManualBookingAtomically(
  admin: SupabaseClient,
  input: ManualBookingInput,
): Promise<ManualBookingTransactionResult> {
  const { data, error } = await admin.rpc('create_manual_booking_atomic', {
    p_departure_id: input.departureId,
    p_request_id: input.requestId,
    p_client_id: input.clientId,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_traveller_count: input.travellerCount,
    p_total_price_usd: input.totalPriceUsd,
    p_status: input.status,
    p_travellers: input.travellers,
    p_deposit_usd: input.depositUsd,
    p_deposit_method: input.depositMethod,
    p_deposit_reference: input.depositReference,
    p_created_by: input.createdBy,
  })

  if (error) throw error
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('MANUAL_BOOKING_INVALID_RPC_RESPONSE')
  }

  const row = data as Record<string, unknown>
  if (typeof row.bookingId !== 'string') {
    throw new Error('MANUAL_BOOKING_INVALID_RPC_RESPONSE')
  }

  return {
    bookingId: row.bookingId,
    clientId: typeof row.clientId === 'string' ? row.clientId : null,
    groupSize: Number(row.groupSize ?? 0),
    depositDueUsd: Number(row.depositDueUsd ?? 0),
  }
}

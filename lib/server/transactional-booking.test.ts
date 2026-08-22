import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { mapDepartureBookingError } from './create-booking'
import { acceptQuoteAtomically, mapQuoteAcceptanceError } from './quote-booking'
import { createManualBookingAtomically, mapManualBookingError } from './manual-booking'

function clientWithRpc(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error })
  return { client: { rpc } as unknown as SupabaseClient, rpc }
}

describe('transactional booking RPC contracts', () => {
  it('maps capacity conflicts to a public 409 response', () => {
    expect(mapDepartureBookingError({ message: 'BOOKING_NOT_ENOUGH_SEATS' })).toEqual({
      status: 409,
      error: 'There are not enough places left for this group size.',
    })
  })

  it('maps quote delivery/version binding failures without exposing database errors', () => {
    expect(mapQuoteAcceptanceError({ message: 'QUOTE_LINK_INVALID: internal detail' })).toEqual({
      status: 404,
      error: 'Invalid quote link.',
    })
  })

  it('blocks acceptance until a custom proposal has dates and an approved price', () => {
    expect(mapQuoteAcceptanceError({ message: 'QUOTE_DATES_REQUIRED' })).toEqual({
      status: 409,
      error: 'Add complete travel dates before accepting this custom proposal.',
    })
    expect(mapQuoteAcceptanceError({ message: 'QUOTE_POSITIVE_PRICE_REQUIRED' })).toEqual({
      status: 409,
      error: 'Complete and approve a positive selling price before accepting this proposal.',
    })
  })

  it('passes the complete public acceptance contract to one RPC', async () => {
    const { client, rpc } = clientWithRpc({
      acceptanceId: 'acceptance-id',
      bookingId: 'booking-id',
      clientId: 'client-id',
      departureId: 'trip-id',
      createdOperationalTrip: true,
      groupSize: 2,
      totalPriceUsd: 4200,
      depositDueUsd: 1260,
    })

    const result = await acceptQuoteAtomically(client, {
      quoteId: 'quote-id',
      versionId: 'version-id',
      deliveryId: 'delivery-id',
      clientName: 'Test Client',
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    })

    expect(rpc).toHaveBeenCalledOnce()
    expect(rpc).toHaveBeenCalledWith('accept_quote_atomic', {
      p_quote_id: 'quote-id',
      p_version_id: 'version-id',
      p_delivery_id: 'delivery-id',
      p_client_name: 'Test Client',
      p_ip_address: '127.0.0.1',
      p_user_agent: 'vitest',
      p_is_admin: false,
    })
    expect(result.bookingId).toBe('booking-id')
    expect(result.departureId).toBe('trip-id')
    expect(result.createdOperationalTrip).toBe(true)
  })

  it('passes admin booking, traveller and payment data to one RPC', async () => {
    const { client, rpc } = clientWithRpc({
      bookingId: 'booking-id',
      clientId: 'client-id',
      groupSize: 1,
      depositDueUsd: 500,
    })

    const result = await createManualBookingAtomically(client, {
      departureId: 'departure-id',
      requestId: 'request-id',
      clientId: 'client-id',
      startDate: null,
      endDate: null,
      travellerCount: 1,
      totalPriceUsd: 1800,
      status: 'confirmed',
      travellers: [{ firstName: 'Test', lastName: 'Client', email: 'test@example.com' }],
      depositUsd: 300,
      depositMethod: 'bank_transfer',
      depositReference: 'TEST-001',
      createdBy: 'admin-id',
    })

    expect(rpc).toHaveBeenCalledOnce()
    expect(rpc).toHaveBeenCalledWith('create_manual_booking_atomic', expect.objectContaining({
      p_departure_id: 'departure-id',
      p_request_id: 'request-id',
      p_total_price_usd: 1800,
      p_deposit_usd: 300,
    }))
    expect(result.bookingId).toBe('booking-id')
  })

  it('maps manual booking errors to operator-facing copy', () => {
    expect(mapManualBookingError({ message: 'MANUAL_BOOKING_NOT_ENOUGH_SEATS' }))
      .toBe('Not enough seats are left on this departure.')
  })
})

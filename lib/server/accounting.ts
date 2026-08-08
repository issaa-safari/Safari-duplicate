// Trip money: what is owed, what has arrived, what is left (server-only).
//
// Thin on purpose — the arithmetic is in lib/balance.ts, which is pure and
// tested. This module only fetches.
//
// A trip is reachable by two keys: the quote it was sold from, and the booking
// it became. Either may be absent — an accepted quote whose booking creation
// failed has no booking, a website booking has no quote — and a trip's payments
// can end up recorded under either. Every read therefore resolves one key to the
// other first, so `getTripBalance` returns the same figures whichever end of the
// trip you ask about.

import type { SupabaseClient } from '@supabase/supabase-js'
import { computeBalance, type Balance } from '@/lib/balance'

export type TripRef = { quoteId?: string | null; bookingId?: string | null }

export interface ResolvedTripRef {
  quoteId: string | null
  bookingId: string | null
}

/** Fill in whichever half of the trip reference the caller did not have. */
export async function resolveTripRef(admin: SupabaseClient, ref: TripRef): Promise<ResolvedTripRef> {
  let quoteId = ref.quoteId ?? null
  let bookingId = ref.bookingId ?? null

  if (bookingId && !quoteId) {
    const { data } = await admin.from('bookings').select('quote_id').eq('id', bookingId).maybeSingle()
    quoteId = (data?.quote_id as string | null) ?? null
  } else if (quoteId && !bookingId) {
    const { data } = await admin.from('bookings').select('id').eq('quote_id', quoteId).limit(1).maybeSingle()
    bookingId = (data?.id as string | null) ?? null
  }

  return { quoteId, bookingId }
}

export interface TripPaymentRow {
  id: string
  amount_usd: number
  payment_type: string | null
  method: string | null
  reference: string | null
  notes: string | null
  received_at: string
}

/** Every payment recorded against a trip, under either of its keys, oldest first. */
export async function getTripPayments(
  admin: SupabaseClient,
  ref: ResolvedTripRef
): Promise<TripPaymentRow[]> {
  const { quoteId, bookingId } = ref
  if (!quoteId && !bookingId) return []

  const filters: string[] = []
  if (quoteId) filters.push(`quote_id.eq.${quoteId}`)
  if (bookingId) filters.push(`booking_id.eq.${bookingId}`)

  const { data } = await admin
    .from('trip_payments')
    .select('id, amount_usd, payment_type, method, reference, notes, received_at')
    .or(filters.join(','))
    .order('received_at', { ascending: true })

  return (data ?? []) as TripPaymentRow[]
}

export interface TripServiceRow {
  id: string
  service_id: string
  name_en: string
  name_ar: string | null
  unit_price_usd: number
  quantity: number
  total_usd: number
}

/** Add-on services sold with this trip — visas, insurance and the like. */
export async function getTripServices(
  admin: SupabaseClient,
  ref: ResolvedTripRef
): Promise<TripServiceRow[]> {
  const { quoteId, bookingId } = ref
  if (!quoteId && !bookingId) return []

  const filters: string[] = []
  if (quoteId) filters.push(`quote_id.eq.${quoteId}`)
  if (bookingId) filters.push(`booking_id.eq.${bookingId}`)

  const { data } = await admin
    .from('trip_services')
    .select('id, service_id, name_en, name_ar, unit_price_usd, quantity, total_usd')
    .or(filters.join(','))
    .order('created_at', { ascending: true })

  return (data ?? []) as TripServiceRow[]
}

/**
 * The trip price alone: the accepted quote version's selling total when there is
 * one, else the price snapshotted onto the booking. Services are added on top by
 * the caller, because they are priced outside the itinerary.
 *
 * Note this is the *internal* total. Once invoices land (group_75) an issued
 * invoice's own total takes precedence, because the figure a client agreed to on
 * the proposal is derived per traveller and can differ from this one.
 */
export async function getTripPriceUsd(
  admin: SupabaseClient,
  ref: ResolvedTripRef
): Promise<number> {
  if (ref.quoteId) {
    const { data } = await admin
      .from('quote_versions')
      .select('total_selling_usd')
      .eq('quote_id', ref.quoteId)
      .eq('status', 'accepted')
      .maybeSingle()
    if (data) return Number(data.total_selling_usd ?? 0)
  }
  if (ref.bookingId) {
    const { data } = await admin
      .from('bookings')
      .select('total_price_usd')
      .eq('id', ref.bookingId)
      .maybeSingle()
    if (data) return Number(data.total_price_usd ?? 0)
  }
  return 0
}

export async function getDepositPercent(admin: SupabaseClient): Promise<number> {
  const { data } = await admin.from('company_settings').select('deposit_percent').limit(1).maybeSingle()
  return Number(data?.deposit_percent ?? 0)
}

export interface TripBalance extends Balance {
  ref: ResolvedTripRef
  payments: TripPaymentRow[]
  services: TripServiceRow[]
  /** The trip itself, before add-ons. `invoicedUsd` is this plus servicesUsd. */
  tripPriceUsd: number
  servicesUsd: number
}

export async function getTripBalance(admin: SupabaseClient, ref: TripRef): Promise<TripBalance> {
  const resolved = await resolveTripRef(admin, ref)
  const [payments, services, tripPriceUsd, depositPercent] = await Promise.all([
    getTripPayments(admin, resolved),
    getTripServices(admin, resolved),
    getTripPriceUsd(admin, resolved),
    getDepositPercent(admin),
  ])

  const servicesUsd = services.reduce((sum, s) => sum + (Number(s.total_usd) || 0), 0)

  return {
    ref: resolved,
    payments,
    services,
    tripPriceUsd,
    servicesUsd,
    ...computeBalance({ invoicedUsd: tripPriceUsd + servicesUsd, payments, depositPercent }),
  }
}

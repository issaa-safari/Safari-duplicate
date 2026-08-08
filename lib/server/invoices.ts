// Raising, reading and retiring invoices (server-only).
//
// Thin, like lib/server/accounting.ts: the decisions live in lib/invoice.ts,
// which is pure and tested, and the freezing rules live in Postgres
// (group_76_invoices.sql), where nothing can route around them. This module
// fetches, and turns a trip into a draft.

import type { SupabaseClient } from '@supabase/supabase-js'
import { computeBalance } from '@/lib/balance'
import {
  allocatePayments,
  buildDraftLines,
  invoiceDisplayStatus,
  type DraftLine,
} from '@/lib/invoice'
import {
  getTripPayments,
  getTripServices,
  getTripPriceUsd,
  resolveTripRef,
  type ResolvedTripRef,
  type TripRef,
} from '@/lib/server/accounting'
import type { Invoice, InvoiceDisplayStatus, InvoiceLine } from '@/lib/types'

const INVOICE_COLUMNS =
  'id, quote_id, booking_id, invoice_number, status, issue_date, due_date, client_id, ' +
  'client_name, client_email, client_address, currency, total_usd, notes, terms, ' +
  'issued_at, voided_at, void_reason, created_by, created_at, updated_at'

const LINE_COLUMNS =
  'id, invoice_id, description_en, description_ar, quantity, unit_price_usd, total_usd, ' +
  'kind, trip_service_id, sort_order, created_at, updated_at'

/** Every invoice raised against a trip, under either of its keys, newest first. */
export async function getTripInvoices(
  admin: SupabaseClient,
  ref: ResolvedTripRef
): Promise<Invoice[]> {
  const { quoteId, bookingId } = ref
  if (!quoteId && !bookingId) return []

  const filters: string[] = []
  if (quoteId) filters.push(`quote_id.eq.${quoteId}`)
  if (bookingId) filters.push(`booking_id.eq.${bookingId}`)

  const { data } = await admin
    .from('invoices')
    .select(INVOICE_COLUMNS)
    .or(filters.join(','))
    .order('created_at', { ascending: false })

  return (data ?? []) as unknown as Invoice[]
}

export async function getInvoice(
  admin: SupabaseClient,
  id: string
): Promise<{ invoice: Invoice; lines: InvoiceLine[] } | null> {
  const { data: invoice } = await admin
    .from('invoices')
    .select(INVOICE_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (!invoice) return null

  const { data: lines } = await admin
    .from('invoice_lines')
    .select(LINE_COLUMNS)
    .eq('invoice_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  return {
    invoice: invoice as unknown as Invoice,
    lines: (lines ?? []) as unknown as InvoiceLine[],
  }
}

// ── Raising one ─────────────────────────────────────────────────────────────

interface TripIdentity {
  label: string
  labelAr: string | null
  clientId: string | null
  clientName: string | null
  clientEmail: string | null
}

/**
 * What to write on the document: who it is for, and what the trip is called.
 *
 * The quote's accepted version supplies the title when there is one, because
 * that is the wording the client agreed to. A booking falls back to its
 * departure's tour.
 */
async function getTripIdentity(
  admin: SupabaseClient,
  ref: ResolvedTripRef
): Promise<TripIdentity> {
  let label = 'Safari trip'
  let labelAr: string | null = null
  let clientId: string | null = null

  if (ref.quoteId) {
    const { data: quote } = await admin
      .from('quotes')
      .select('client_id')
      .eq('id', ref.quoteId)
      .maybeSingle()
    clientId = (quote?.client_id as string | null) ?? null

    const { data: version } = await admin
      .from('quote_versions')
      .select('title')
      .eq('quote_id', ref.quoteId)
      .eq('status', 'accepted')
      .maybeSingle()
    if (version?.title) label = version.title as string
  }

  if (ref.bookingId) {
    const { data: booking } = await admin
      .from('bookings')
      .select('client_id, departures(tours(title_en, title_ar))')
      .eq('id', ref.bookingId)
      .maybeSingle()

    clientId = clientId ?? ((booking?.client_id as string | null) ?? null)

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const tour = (booking as any)?.departures?.tours
    /* eslint-enable @typescript-eslint/no-explicit-any */
    if (tour?.title_en && label === 'Safari trip') label = tour.title_en as string
    if (tour?.title_ar) labelAr = tour.title_ar as string
  }

  let clientName: string | null = null
  let clientEmail: string | null = null
  if (clientId) {
    const { data: client } = await admin
      .from('clients')
      .select('first_name, last_name, email')
      .eq('id', clientId)
      .maybeSingle()
    if (client) {
      clientName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || null
      clientEmail = (client.email as string | null) ?? null
    }
  }

  return { label, labelAr, clientId, clientName, clientEmail }
}

/**
 * Raise a draft for a trip, pre-filled from what it is worth: the itinerary
 * price as one line and each add-on service as its own.
 *
 * Returns the new invoice's id. It is a *draft* — nothing is numbered, dated or
 * frozen until it is issued, so an operator can correct the wording first.
 */
export async function createDraftInvoice(
  admin: SupabaseClient,
  ref: TripRef,
  createdBy?: string | null
): Promise<string> {
  const resolved = await resolveTripRef(admin, ref)
  if (!resolved.quoteId && !resolved.bookingId) {
    throw new Error('An invoice must belong to a quote or a booking.')
  }

  const [identity, services, tripPriceUsd] = await Promise.all([
    getTripIdentity(admin, resolved),
    getTripServices(admin, resolved),
    getTripPriceUsd(admin, resolved),
  ])

  const { data: invoice, error } = await admin
    .from('invoices')
    .insert({
      quote_id: resolved.quoteId,
      booking_id: resolved.bookingId,
      client_id: identity.clientId,
      client_name: identity.clientName,
      client_email: identity.clientEmail,
      created_by: createdBy ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  const lines: DraftLine[] = buildDraftLines({
    tripPriceUsd,
    tripLabel: identity.label,
    tripLabelAr: identity.labelAr,
    services,
  })

  if (lines.length > 0) {
    const { error: linesError } = await admin
      .from('invoice_lines')
      .insert(lines.map((l) => ({ ...l, invoice_id: invoice.id })))

    // A header with no lines is a $0.00 invoice nobody asked for, so the draft
    // does not survive its own lines failing.
    if (linesError) {
      await admin.from('invoices').delete().eq('id', invoice.id)
      throw new Error(linesError.message)
    }
  }

  return invoice.id as string
}

// ── Reading with the ledger alongside ───────────────────────────────────────

export interface InvoiceSummary {
  invoice: Invoice
  receivedUsd: number
  balanceUsd: number
  displayStatus: InvoiceDisplayStatus
}

export interface TripInvoiceSummary {
  invoices: InvoiceSummary[]
  /** Money on the trip that no live invoice claims — usually a pre-invoice deposit. */
  unallocatedUsd: number
  /**
   * What the trip has been formally billed: the sum of its live invoices. Zero
   * when none has been issued, which is when callers fall back to the internal
   * trip price.
   */
  issuedTotalUsd: number
}

export async function getTripInvoiceSummary(
  admin: SupabaseClient,
  ref: TripRef
): Promise<TripInvoiceSummary> {
  const resolved = await resolveTripRef(admin, ref)
  const [invoices, payments] = await Promise.all([
    getTripInvoices(admin, resolved),
    getTripPayments(admin, resolved),
  ])

  const { byInvoice, unallocatedUsd } = allocatePayments(
    invoices.map((i) => ({ id: i.id, status: i.status })),
    payments
  )

  const summaries = invoices.map((invoice) => {
    const receivedUsd = byInvoice[invoice.id] ?? 0
    const { balanceUsd } = computeBalance({
      invoicedUsd: Number(invoice.total_usd),
      payments: [{ amount_usd: receivedUsd }],
    })
    return {
      invoice,
      receivedUsd,
      balanceUsd,
      displayStatus: invoiceDisplayStatus({
        status: invoice.status,
        totalUsd: Number(invoice.total_usd),
        receivedUsd,
        dueDate: invoice.due_date,
      }),
    }
  })

  const issuedTotalUsd = invoices
    .filter((i) => i.status === 'issued')
    .reduce((sum, i) => sum + Number(i.total_usd || 0), 0)

  return { invoices: summaries, unallocatedUsd, issuedTotalUsd }
}

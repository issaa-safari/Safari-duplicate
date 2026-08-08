// What an invoice says, and how much of it has been paid.
//
// Pure on purpose, like lib/balance.ts, which this leans on for the arithmetic
// of received-vs-owed. The fetching half lives in lib/server/invoices.ts.
//
// Two ideas do the work here:
//
//   * **A draft is generated, not typed.** `buildDraftLines` turns a trip — its
//     price and whatever add-on services it bought — into the lines an invoice
//     starts with, so raising one is a click rather than a re-keying exercise.
//     The operator can then edit the draft; once issued it is frozen in Postgres.
//
//   * **Paid is derived.** The database stores draft / issued / void only.
//     `invoiceDisplayStatus` is where "paid", "part-paid" and "overdue" come
//     from, computed against the ledger every time they are shown, so a payment
//     recorded anywhere updates every screen at once.

import type { InvoiceDisplayStatus, InvoiceLineKind, InvoiceStatus } from '@/lib/types'

const round2 = (n: number) => Math.round(n * 100) / 100

// ── Building a draft ────────────────────────────────────────────────────────

export interface DraftLine {
  description_en: string
  description_ar: string | null
  quantity: number
  unit_price_usd: number
  kind: InvoiceLineKind
  trip_service_id: string | null
  sort_order: number
}

export interface DraftLineInput {
  /** The itinerary's own price, before add-ons. */
  tripPriceUsd: number
  /** What the trip line is called on the document, e.g. the tour title. */
  tripLabel: string
  tripLabelAr?: string | null
  services?: {
    id: string
    name_en: string
    name_ar?: string | null
    unit_price_usd: number | string
    quantity: number | string
  }[]
}

/**
 * The lines a new draft starts with: the trip as one line, then each add-on
 * service as its own, so the client can see what the visas and insurance cost
 * separately from the safari.
 *
 * A zero-price trip contributes no line — that is a trip whose price has not
 * been set yet, and an invoice reading "$0.00" for a safari is worse than one
 * that simply does not mention it.
 */
export function buildDraftLines({
  tripPriceUsd,
  tripLabel,
  tripLabelAr,
  services = [],
}: DraftLineInput): DraftLine[] {
  const lines: DraftLine[] = []

  const trip = round2(Number(tripPriceUsd) || 0)
  if (trip > 0) {
    lines.push({
      description_en: tripLabel,
      description_ar: tripLabelAr ?? null,
      quantity: 1,
      unit_price_usd: trip,
      kind: 'trip',
      trip_service_id: null,
      sort_order: 10,
    })
  }

  services.forEach((s, i) => {
    lines.push({
      description_en: s.name_en,
      description_ar: s.name_ar ?? null,
      quantity: Number(s.quantity) || 1,
      unit_price_usd: round2(Number(s.unit_price_usd) || 0),
      kind: 'service',
      trip_service_id: s.id,
      sort_order: 100 + i * 10,
    })
  })

  return lines
}

export function draftLinesTotalUsd(lines: DraftLine[]): number {
  return round2(lines.reduce((sum, l) => sum + round2(l.quantity * l.unit_price_usd), 0))
}

// ── Allocating payments ─────────────────────────────────────────────────────

export interface AllocatablePayment {
  invoice_id?: string | null
  amount_usd: number | string
  payment_type?: string | null
}

export interface AllocatableInvoice {
  id: string
  status: InvoiceStatus
}

export interface Allocation {
  /** Received against each invoice, refunds already subtracted. */
  byInvoice: Record<string, number>
  /** Money on the trip that belongs to no invoice — usually a pre-invoice deposit. */
  unallocatedUsd: number
}

/**
 * Split a trip's payments across its invoices.
 *
 * A payment that names an invoice belongs to it. One that does not — a deposit
 * taken at acceptance, before any invoice existed, or anything recorded before
 * group_76 — belongs to the trip's single live invoice when there is exactly
 * one, which is the ordinary case. With two or more it stays unallocated rather
 * than being guessed at: money silently attributed to the wrong document is
 * worse than money visibly attributed to none.
 *
 * Void invoices are never a target. They have no claim on the client, so a
 * payment left pointing at one falls back to the trip's live invoice if there
 * is a single one.
 */
export function allocatePayments(
  invoices: AllocatableInvoice[],
  payments: AllocatablePayment[]
): Allocation {
  const live = invoices.filter((i) => i.status === 'issued')
  const soleLiveId = live.length === 1 ? live[0].id : null
  const liveIds = new Set(live.map((i) => i.id))

  const byInvoice: Record<string, number> = {}
  for (const i of invoices) byInvoice[i.id] = 0
  let unallocated = 0

  for (const p of payments) {
    const amount = Number(p.amount_usd) || 0
    const signed = p.payment_type === 'refund' ? -amount : amount

    const named = p.invoice_id ?? null
    const target = named && liveIds.has(named) ? named : soleLiveId

    if (target) byInvoice[target] = (byInvoice[target] ?? 0) + signed
    else unallocated += signed
  }

  for (const id of Object.keys(byInvoice)) byInvoice[id] = round2(byInvoice[id])
  return { byInvoice, unallocatedUsd: round2(unallocated) }
}

// ── Status for display ──────────────────────────────────────────────────────

export interface DisplayStatusInput {
  status: InvoiceStatus
  totalUsd: number
  receivedUsd: number
  dueDate?: string | null
  /** ISO date; defaults to today. Injected so the tests do not depend on when they run. */
  today?: string
}

/**
 * The label a screen shows. `void` and `draft` are taken at face value; an
 * issued invoice is judged against the ledger and then against its due date.
 *
 * An overpaid invoice reads "paid", not something louder — the overpayment is
 * the trip balance's business, and `recordPayment` already refuses to create one.
 */
export function invoiceDisplayStatus({
  status,
  totalUsd,
  receivedUsd,
  dueDate,
  today,
}: DisplayStatusInput): InvoiceDisplayStatus {
  if (status !== 'issued') return status

  const total = round2(Number(totalUsd) || 0)
  const received = round2(Number(receivedUsd) || 0)

  if (total > 0 && received >= total - 0.005) return 'paid'

  const asOf = today ?? new Date().toISOString().slice(0, 10)
  if (dueDate && dueDate < asOf) return 'overdue'

  return received > 0 ? 'part-paid' : 'issued'
}

export const INVOICE_STATUS_LABEL: Record<InvoiceDisplayStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  'part-paid': 'Part paid',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
}

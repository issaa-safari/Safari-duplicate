// Shared finance aggregations (server-only, service-role client).
//
// Payables rule (spec Â§G1/G3): only ACCEPTED versions' price lines are
// supplier liabilities â€” a superseded sibling track never becomes payable.

import type { SupabaseClient } from '@supabase/supabase-js'
import { computeBalance } from '@/lib/balance'

export interface ReceivablesSummary {
  invoicedUsd: number
  receivedUsd: number
  outstandingUsd: number
}

export interface PayableQuoteBreakdown {
  quoteId: string
  quoteNumber: string | null
  owedUsd: number
}

export interface SupplierPayable {
  supplierId: string
  supplierName: string
  supplierType: string
  owedUsd: number
  paidUsd: number
  balanceUsd: number
  byQuote: PayableQuoteBreakdown[]
  payments: {
    id: string
    amountUsd: number
    method: string | null
    reference: string | null
    paidAt: string
    quoteId: string | null
  }[]
}

export interface PayablesSummary {
  suppliers: SupplierPayable[]
  totalOwedUsd: number
  totalPaidUsd: number
  totalBalanceUsd: number
  /** Cost on accepted versions whose rate cards have no supplier link */
  unattributedCostUsd: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Everything owed to the business, across both kinds of trip.
 *
 * This used to count accepted quotes only, so revenue from bookings made
 * directly on the website â€” which have no quote behind them â€” was missing from
 * the dashboard entirely. Adding them moves the figure up; that is the
 * correction, not a regression.
 */
export async function getReceivablesSummary(admin: SupabaseClient): Promise<ReceivablesSummary> {
  const [{ data: acceptedVersions }, { data: directBookings }, { data: payments }, { data: invoices }, { data: services }] = await Promise.all([
    admin.from('quote_versions').select('quote_id, total_selling_usd').eq('status', 'accepted'),
    admin.from('bookings').select('id, total_price_usd').is('quote_id', null).eq('status', 'confirmed'),
    admin.from('trip_payments').select('quote_id, booking_id, amount_usd, payment_type'),
    admin.from('invoices').select('quote_id, booking_id, total_usd').eq('status', 'issued'),
    admin.from('trip_services').select('quote_id, booking_id, total_usd'),
  ])

  type AnchorRow = { quote_id: string | null; booking_id: string | null; total_usd: number | null }
  const totalFor = (kind: 'quote_id' | 'booking_id', id: string, base: number) => {
    const issued = ((invoices ?? []) as AnchorRow[]).filter(row => row[kind] === id)
    if (issued.length > 0) return issued.reduce((sum, row) => sum + Number(row.total_usd ?? 0), 0)
    return base + ((services ?? []) as AnchorRow[])
      .filter(row => row[kind] === id)
      .reduce((sum, row) => sum + Number(row.total_usd ?? 0), 0)
  }

  const quoteTotals = (acceptedVersions ?? []).map((version: { quote_id: string; total_selling_usd: number | null }) =>
    totalFor('quote_id', version.quote_id, Number(version.total_selling_usd ?? 0)))
  const bookingTotals = (directBookings ?? []).map((booking: { id: string; total_price_usd: number | null }) =>
    totalFor('booking_id', booking.id, Number(booking.total_price_usd ?? 0)))
  const invoiced = [...quoteTotals, ...bookingTotals].reduce((sum, total) => sum + total, 0)

  const { receivedUsd, balanceUsd } = computeBalance({ invoicedUsd: invoiced, payments: payments ?? [] })
  return {
    invoicedUsd: round2(invoiced),
    receivedUsd,
    outstandingUsd: balanceUsd,
  }
}

export async function getPayables(admin: SupabaseClient): Promise<PayablesSummary> {
  const { data: acceptedVersions } = await admin
    .from('quote_versions')
    .select('id, quote_id')
    .eq('status', 'accepted')

  const versionIds = (acceptedVersions ?? []).map((v: { id: string }) => v.id)
  const quoteIdByVersion = new Map<string, string>(
    (acceptedVersions ?? []).map((v: { id: string; quote_id: string }) => [v.id, v.quote_id]),
  )

  interface LineRow { quote_version_id: string; rate_card_id: string | null; total_cost_usd: number | null; is_optional: boolean }
  let lines: LineRow[] = []
  if (versionIds.length > 0) {
    const { data } = await admin
      .from('quote_price_lines')
      .select('quote_version_id, rate_card_id, total_cost_usd, is_optional')
      .in('quote_version_id', versionIds)
    lines = ((data ?? []) as LineRow[]).filter(l => !l.is_optional)
  }

  const cardIds = [...new Set(lines.map(l => l.rate_card_id).filter((id): id is string => !!id))]
  const supplierByCard = new Map<string, string>()
  if (cardIds.length > 0) {
    const { data: cards } = await admin
      .from('supplier_rate_cards')
      .select('id, supplier_id')
      .in('id', cardIds)
    for (const c of (cards ?? []) as { id: string; supplier_id: string | null }[]) {
      if (c.supplier_id) supplierByCard.set(c.id, c.supplier_id)
    }
  }

  const [{ data: suppliersData }, { data: paymentsData }, { data: quotesData }] = await Promise.all([
    admin.from('suppliers').select('id, name, supplier_type'),
    admin.from('supplier_payments').select('id, supplier_id, quote_id, amount_usd, method, reference, paid_at').order('paid_at', { ascending: false }),
    (async () => {
      const quoteIds = [...new Set([...quoteIdByVersion.values()])]
      if (quoteIds.length === 0) return { data: [] as { id: string; quote_number: string | null }[] }
      return admin.from('quotes').select('id, quote_number').in('id', quoteIds)
    })(),
  ])

  const quoteNumberById = new Map<string, string | null>(
    ((quotesData ?? []) as { id: string; quote_number: string | null }[]).map(q => [q.id, q.quote_number]),
  )

  // owed per supplier (and per quote within a supplier)
  const owedBySupplier = new Map<string, number>()
  const owedByQuote = new Map<string, Map<string, number>>()
  let unattributed = 0
  for (const line of lines) {
    const cost = Number(line.total_cost_usd ?? 0)
    if (cost === 0) continue
    const supplierId = line.rate_card_id ? supplierByCard.get(line.rate_card_id) : undefined
    if (!supplierId) { unattributed += cost; continue }
    owedBySupplier.set(supplierId, (owedBySupplier.get(supplierId) ?? 0) + cost)
    const quoteId = quoteIdByVersion.get(line.quote_version_id)
    if (quoteId) {
      const perQuote = owedByQuote.get(supplierId) ?? new Map<string, number>()
      perQuote.set(quoteId, (perQuote.get(quoteId) ?? 0) + cost)
      owedByQuote.set(supplierId, perQuote)
    }
  }

  interface PaymentRow { id: string; supplier_id: string; quote_id: string | null; amount_usd: number; method: string | null; reference: string | null; paid_at: string }
  const paymentsBySupplier = new Map<string, PaymentRow[]>()
  for (const p of ((paymentsData ?? []) as PaymentRow[])) {
    const list = paymentsBySupplier.get(p.supplier_id) ?? []
    list.push(p)
    paymentsBySupplier.set(p.supplier_id, list)
  }

  const suppliers: SupplierPayable[] = []
  for (const s of ((suppliersData ?? []) as { id: string; name: string; supplier_type: string }[])) {
    const owed = owedBySupplier.get(s.id) ?? 0
    const payments = paymentsBySupplier.get(s.id) ?? []
    const paid = payments.reduce((sum, p) => sum + Number(p.amount_usd), 0)
    if (owed === 0 && paid === 0) continue
    suppliers.push({
      supplierId: s.id,
      supplierName: s.name,
      supplierType: s.supplier_type,
      owedUsd: round2(owed),
      paidUsd: round2(paid),
      balanceUsd: round2(owed - paid),
      byQuote: [...(owedByQuote.get(s.id) ?? new Map<string, number>()).entries()]
        .map(([quoteId, owedUsd]) => ({
          quoteId,
          quoteNumber: quoteNumberById.get(quoteId) ?? null,
          owedUsd: round2(owedUsd),
        }))
        .sort((a, b) => b.owedUsd - a.owedUsd),
      payments: payments.map(p => ({
        id: p.id,
        amountUsd: Number(p.amount_usd),
        method: p.method,
        reference: p.reference,
        paidAt: p.paid_at,
        quoteId: p.quote_id,
      })),
    })
  }
  suppliers.sort((a, b) => b.balanceUsd - a.balanceUsd)

  return {
    suppliers,
    totalOwedUsd: round2(suppliers.reduce((s, x) => s + x.owedUsd, 0)),
    totalPaidUsd: round2(suppliers.reduce((s, x) => s + x.paidUsd, 0)),
    totalBalanceUsd: round2(suppliers.reduce((s, x) => s + x.balanceUsd, 0)),
    unattributedCostUsd: round2(unattributed),
  }
}

const DEFAULT_USD_TO_KES = 129

export async function getUsdToKesRate(admin: SupabaseClient): Promise<number> {
  // select('*') so this works before group_33 adds usd_to_kes_rate.
  const { data } = await admin.from('company_settings').select('*').limit(1).maybeSingle()
  const rate = Number((data as Record<string, unknown> | null)?.usd_to_kes_rate)
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_USD_TO_KES
}


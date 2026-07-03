// Shared finance aggregations (server-only, service-role client).
//
// Payables rule (spec §G1/G3): only ACCEPTED versions' price lines are
// supplier liabilities — a superseded sibling track never becomes payable.

import type { SupabaseClient } from '@supabase/supabase-js'

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

export async function getReceivablesSummary(admin: SupabaseClient): Promise<ReceivablesSummary> {
  const [{ data: acceptedVersions }, { data: payments }] = await Promise.all([
    admin.from('quote_versions').select('total_selling_usd').eq('status', 'accepted'),
    admin.from('quote_payments').select('amount_usd, payment_type'),
  ])
  const invoiced = (acceptedVersions ?? []).reduce(
    (s: number, v: { total_selling_usd: number | null }) => s + Number(v.total_selling_usd ?? 0), 0)
  const received = (payments ?? []).reduce(
    (s: number, p: { amount_usd: number; payment_type: string | null }) =>
      p.payment_type === 'refund' ? s - Number(p.amount_usd) : s + Number(p.amount_usd), 0)
  return {
    invoicedUsd: round2(invoiced),
    receivedUsd: round2(received),
    outstandingUsd: round2(Math.max(invoiced - received, 0)),
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

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import FinanceNav from '../finance-nav'
import { getUsdToKesRate } from '@/lib/server/finance'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmt2(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function label(v: string) {
  return v.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default async function PnlPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; basis?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const params = await searchParams
  const now = new Date()
  const defaultFrom = isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)))
  const defaultTo = isoDate(now)
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? '') ? params.from! : defaultFrom
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? '') ? params.to! : defaultTo
  // Accrual counts an invoice the moment it's issued, whether or not it has
  // been paid; cash counts money only once it has actually arrived. Default
  // to accrual — the closest match to what this page showed before it counted
  // accepted quotes (also an accrual-style figure), so the number on a
  // bookmarked link doesn't suddenly change underneath someone.
  const basis = params.basis === 'cash' ? 'cash' : 'accrual'

  const admin = createAdminClient()

  const [{ data: acceptances }, revenueResult, expensesResult, usdToKes] = await Promise.all([
    admin.from('quote_acceptances')
      .select('id, accepted_at, quote_id, quote_version_id, quote_versions(total_selling_usd, total_cost_usd), quotes(quote_number)')
      .gte('accepted_at', `${from}T00:00:00Z`)
      .lte('accepted_at', `${to}T23:59:59Z`)
      .order('accepted_at', { ascending: false }),
    basis === 'accrual'
      ? admin.from('invoices')
          .select('id, invoice_number, issue_date, total_usd')
          .eq('status', 'issued')
          .gte('issue_date', from)
          .lte('issue_date', to)
          .order('issue_date', { ascending: false })
      : admin.from('trip_payments')
          .select('id, received_at, amount_usd, payment_type, method, reference')
          .gte('received_at', from)
          .lte('received_at', to)
          .order('received_at', { ascending: false }),
    admin.from('expenses')
      .select('category, amount_usd')
      .gte('expense_date', from)
      .lte('expense_date', to),
    getUsdToKesRate(admin),
  ])

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const acceptedRows = (acceptances ?? []).map((a: any) => ({
    id: a.id as string,
    acceptedAt: a.accepted_at as string,
    quoteId: a.quote_id as string,
    quoteNumber: (a.quotes as any)?.quote_number ?? '—',
    sellingUsd: Number((a.quote_versions as any)?.total_selling_usd ?? 0),
    costUsd: Number((a.quote_versions as any)?.total_cost_usd ?? 0),
  }))
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Direct costs stay sourced from accepted quote versions regardless of the
  // revenue basis above — a direct booking or freehand invoice has no supplier
  // cost breakdown recorded anywhere, so there is nothing else to sum here.
  // That means gross margin mixes an accrual-of-acceptance cost figure against
  // a revenue figure that may be on either basis; imperfect, but the
  // alternative (no cost figure at all) is worse, and this is the pairing the
  // page has always used.
  const directCosts = acceptedRows.reduce((s, r) => s + r.costUsd, 0)

  interface InvoiceRevenueRow { id: string; label: string; date: string | null; amountUsd: number }
  interface PaymentRevenueRow { id: string; date: string; type: string | null; method: string | null; reference: string | null; amountUsd: number }

  const invoiceRevenueRows: InvoiceRevenueRow[] = basis === 'accrual'
    ? ((revenueResult.data ?? []) as { id: string; invoice_number: string | null; issue_date: string | null; total_usd: number }[])
        .map((i) => ({ id: i.id, label: i.invoice_number ?? 'Draft', date: i.issue_date, amountUsd: Number(i.total_usd) || 0 }))
    : []

  const paymentRevenueRows: PaymentRevenueRow[] = basis === 'cash'
    ? ((revenueResult.data ?? []) as { id: string; received_at: string; amount_usd: number; payment_type: string | null; method: string | null; reference: string | null }[])
        .map((p) => ({ id: p.id, date: p.received_at, type: p.payment_type, method: p.method, reference: p.reference, amountUsd: Number(p.amount_usd) || 0 }))
    : []

  const revenue = basis === 'accrual'
    ? invoiceRevenueRows.reduce((s, r) => s + r.amountUsd, 0)
    : paymentRevenueRows.reduce((s, r) => (r.type === 'refund' ? s - r.amountUsd : s + r.amountUsd), 0)
  const gross = revenue - directCosts
  const grossPct = revenue > 0 ? (gross / revenue) * 100 : 0

  const expensesAvailable = !expensesResult.error
  const expenseByCategory = new Map<string, number>()
  for (const x of ((expensesResult.data ?? []) as { category: string; amount_usd: number }[])) {
    expenseByCategory.set(x.category, (expenseByCategory.get(x.category) ?? 0) + Number(x.amount_usd))
  }
  const totalExpenses = [...expenseByCategory.values()].reduce((s, v) => s + v, 0)
  const net = gross - totalExpenses

  const kes = (usd: number) => `KES ${fmt(usd * usdToKes)}`

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Finance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Profit &amp; loss over a date range — revenue {basis === 'accrual' ? 'from invoices issued' : 'from payments received'} in the range, direct costs from quote versions accepted in it, overheads from the expense log
        </p>
      </div>

      <FinanceNav active="/admin/finance/pnl" />

      {/* Date range + basis */}
      <form method="get" className="flex flex-wrap items-end gap-3 mb-6 rounded-xl border border-border bg-surface shadow-sm p-4">
        <div>
          <label htmlFor="from" className="block text-xs text-muted-foreground mb-1">From</label>
          <input id="from" type="date" name="from" defaultValue={from}
            className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
        </div>
        <div>
          <label htmlFor="to" className="block text-xs text-muted-foreground mb-1">To</label>
          <input id="to" type="date" name="to" defaultValue={to}
            className="rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50" />
        </div>
        <input type="hidden" name="basis" value={basis} />
        <button type="submit"
          className="rounded-md px-4 py-2 text-sm font-medium text-white bg-olive hover:bg-olive-dk">
          Apply
        </button>
        <div className="flex rounded-md border border-border overflow-hidden">
          <Link
            href={`/admin/finance/pnl?from=${from}&to=${to}&basis=accrual`}
            className={`px-3 py-2 text-sm font-medium ${basis === 'accrual' ? 'bg-olive text-white' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Accrual
          </Link>
          <Link
            href={`/admin/finance/pnl?from=${from}&to=${to}&basis=cash`}
            className={`px-3 py-2 text-sm font-medium ${basis === 'cash' ? 'bg-olive text-white' : 'text-muted-foreground hover:bg-muted'}`}
          >
            Cash
          </Link>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">USD · KES @ {fmt(usdToKes)} · {from} → {to}</span>
      </form>

      {/* P&L statement */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden mb-6">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-border/70">
              <td className="px-5 py-3 font-medium text-foreground">Revenue <span className="text-xs text-muted-foreground font-normal">({basis === 'accrual' ? 'invoices issued' : 'payments received'} in range)</span></td>
              <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">${fmt2(revenue)}</td>
              <td className="px-5 py-3 text-right text-xs text-muted-foreground tabular-nums w-40">{kes(revenue)}</td>
            </tr>
            <tr className="border-b border-border/70">
              <td className="px-5 py-3 font-medium text-foreground">Direct costs <span className="text-xs text-muted-foreground font-normal">(supplier costs of the same versions)</span></td>
              <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">−${fmt2(directCosts)}</td>
              <td className="px-5 py-3 text-right text-xs text-muted-foreground tabular-nums">{kes(directCosts)}</td>
            </tr>
            <tr className="border-b border-border/70 bg-surface-alt/60">
              <td className="px-5 py-3 font-semibold text-foreground">Gross margin <span className="text-xs font-normal text-muted-foreground">({fmt2(grossPct)}%)</span></td>
              <td className={`px-5 py-3 text-right font-semibold tabular-nums ${gross >= 0 ? 'text-green-700' : 'text-destructive'}`}>${fmt2(gross)}</td>
              <td className="px-5 py-3 text-right text-xs text-muted-foreground tabular-nums">{kes(gross)}</td>
            </tr>
            {expensesAvailable && [...expenseByCategory.entries()].sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <tr key={cat} className="border-b border-gray-50">
                <td className="px-5 py-2.5 text-muted-foreground pl-9">{label(cat)}</td>
                <td className="px-5 py-2.5 text-right text-foreground tabular-nums">−${fmt2(amt)}</td>
                <td className="px-5 py-2.5 text-right text-xs text-muted-foreground tabular-nums">{kes(amt)}</td>
              </tr>
            ))}
            <tr className="border-b border-border/70">
              <td className="px-5 py-3 font-medium text-foreground">Total expenses</td>
              <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">−${fmt2(totalExpenses)}</td>
              <td className="px-5 py-3 text-right text-xs text-muted-foreground tabular-nums">{kes(totalExpenses)}</td>
            </tr>
            <tr className="bg-surface-alt">
              <td className="px-5 py-3.5 font-semibold text-foreground">Net profit</td>
              <td className={`px-5 py-3.5 text-right text-base font-bold tabular-nums ${net >= 0 ? 'text-green-700' : 'text-destructive'}`}>${fmt2(net)}</td>
              <td className="px-5 py-3.5 text-right text-xs text-muted-foreground tabular-nums">{kes(net)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {!expensesAvailable && (
        <p className="mb-6 text-xs text-warning-foreground rounded-xl border border-warning-foreground/20 bg-warning/50 px-4 py-2.5">
          Expense overheads unavailable — apply migration group_33_supplier_finance.sql to include them.
        </p>
      )}

      {/* Revenue detail — basis-conditional */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-border/70">
          <h2 className="text-sm font-semibold text-foreground">
            {basis === 'accrual' ? 'Invoices issued in range' : 'Payments received in range'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">What the revenue figure above is built from</p>
        </div>
        {basis === 'accrual' ? (
          invoiceRevenueRows.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No invoices issued in this range.</p>
          ) : (
            <table className="stack-table w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border/70">
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-3 py-3 font-medium">Issued</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceRevenueRows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <td data-label="Invoice" className="px-5 py-2.5">
                      <Link href={`/admin/finance/invoices/${r.id}`} className="font-mono text-xs text-brand-text hover:underline">
                        {r.label}
                      </Link>
                    </td>
                    <td data-label="Issued" className="px-3 py-2.5 text-muted-foreground text-xs">
                      {r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td data-label="Total" className="px-5 py-2.5 text-right font-medium tabular-nums text-foreground">${fmt(r.amountUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : paymentRevenueRows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No payments received in this range.</p>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/70">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Method</th>
                <th className="px-3 py-3 font-medium">Reference</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {paymentRevenueRows.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <td data-label="Date" className="px-5 py-2.5 text-muted-foreground text-xs">{new Date(r.date).toLocaleDateString('en-GB')}</td>
                  <td data-label="Type" className="px-3 py-2.5 text-foreground">{r.type ?? '—'}</td>
                  <td data-label="Method" className="px-3 py-2.5 text-muted-foreground">{r.method ?? '—'}</td>
                  <td data-label="Reference" className="px-3 py-2.5 text-muted-foreground">{r.reference ?? '—'}</td>
                  <td
                    data-label="Amount"
                    className={`px-5 py-2.5 text-right font-medium tabular-nums ${r.type === 'refund' ? 'text-destructive' : 'text-foreground'}`}
                  >
                    {r.type === 'refund' ? '−' : ''}${fmt(r.amountUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Accepted quotes in range — the direct-cost source, independent of the revenue basis above */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/70">
          <h2 className="text-sm font-semibold text-foreground">Accepted quotes in range</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Direct costs come from here regardless of the revenue basis above — see the file comment
            near directCosts for why.
          </p>
        </div>
        {acceptedRows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No quotes accepted in this range.</p>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/70">
                <th className="px-5 py-3 font-medium">Quote</th>
                <th className="px-3 py-3 font-medium">Accepted</th>
                <th className="px-3 py-3 font-medium text-right">Selling price</th>
                <th className="px-5 py-3 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {acceptedRows.map(r => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <td data-label="Quote" className="px-5 py-2.5">
                    <Link href={`/admin/quotes/${r.quoteId}`} className="font-mono text-xs text-brand-text hover:underline">
                      {r.quoteNumber}
                    </Link>
                  </td>
                  <td data-label="Accepted" className="px-3 py-2.5 text-muted-foreground text-xs">{new Date(r.acceptedAt).toLocaleDateString('en-GB')}</td>
                  <td data-label="Selling price" className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">${fmt(r.sellingUsd)}</td>
                  <td data-label="Cost" className="px-5 py-2.5 text-right font-medium tabular-nums text-foreground">${fmt(r.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

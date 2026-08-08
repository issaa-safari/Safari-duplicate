import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ReceivablesTable from '../receivables-table'
import FinanceNav from '../finance-nav'
import { computeBalance } from '@/lib/balance'
import { invoiceDisplayStatus } from '@/lib/invoice'
import type { InvoiceStatus, Service } from '@/lib/types'

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

interface PaymentRow {
  id: string
  quote_id: string | null
  booking_id: string | null
  amount_usd: number
  payment_type: string
  method: string | null
  reference: string | null
  received_at: string
}

interface ServiceRow {
  id: string
  quote_id: string | null
  booking_id: string | null
  name_en: string
  name_ar: string | null
  unit_price_usd: number
  quantity: number
  total_usd: number
}

interface InvoiceRow {
  id: string
  quote_id: string | null
  booking_id: string | null
  invoice_number: string | null
  status: InvoiceStatus
  due_date: string | null
  total_usd: number
}

export default async function ReceiptsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  const [
    { data: acceptances, error: acceptancesError },
    { data: payments, error: paymentsError },
    { data: directBookings },
    { data: catalogue },
    { data: tripServices },
    { data: invoiceRows },
  ] = await Promise.all([
    admin.from('quote_acceptances')
      .select('id, client_name, accepted_at, quote_version_id, quote_id, quote_versions(title, total_selling_usd, total_cost_usd), quotes(id, quote_number)')
      .order('accepted_at', { ascending: false }),
    admin.from('trip_payments')
      .select('id, quote_id, booking_id, amount_usd, payment_type, method, reference, received_at'),
    admin.from('bookings')
      .select('id, total_price_usd, status, created_at, departure_id, departures(start_date, tours(title_en))')
      .is('quote_id', null)
      .eq('status', 'confirmed'),
    admin.from('services')
      .select('id, name_en, name_ar, default_price_usd, pricing_unit, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .order('name_en'),
    admin.from('trip_services')
      .select('id, quote_id, booking_id, name_en, name_ar, unit_price_usd, quantity, total_usd'),
    admin.from('invoices')
      .select('id, quote_id, booking_id, invoice_number, status, due_date, total_usd')
      .order('created_at', { ascending: false }),
  ])

  if (acceptancesError) console.error('[Receipts] quote_acceptances read error:', acceptancesError.message)
  if (paymentsError) console.error('[Receipts] trip_payments read error:', paymentsError.message)

  // One ledger now, so both kinds of trip are bucketed from the same rows.
  const paymentsByQuote: Record<string, PaymentRow[]> = {}
  const paymentsByBooking: Record<string, PaymentRow[]> = {}
  for (const p of ((payments ?? []) as PaymentRow[])) {
    if (p.quote_id) (paymentsByQuote[p.quote_id] ??= []).push(p)
    else if (p.booking_id) (paymentsByBooking[p.booking_id] ??= []).push(p)
  }

  // Add-ons and invoices, bucketed the same way.
  const servicesByQuote: Record<string, ServiceRow[]> = {}
  const servicesByBooking: Record<string, ServiceRow[]> = {}
  for (const s of ((tripServices ?? []) as unknown as ServiceRow[])) {
    if (s.quote_id) (servicesByQuote[s.quote_id] ??= []).push(s)
    else if (s.booking_id) (servicesByBooking[s.booking_id] ??= []).push(s)
  }

  const invoicesByQuote: Record<string, InvoiceRow[]> = {}
  const invoicesByBooking: Record<string, InvoiceRow[]> = {}
  for (const i of ((invoiceRows ?? []) as unknown as InvoiceRow[])) {
    if (i.quote_id) (invoicesByQuote[i.quote_id] ??= []).push(i)
    else if (i.booking_id) (invoicesByBooking[i.booking_id] ??= []).push(i)
  }

  const sum = (rows: { total_usd: number }[]) =>
    rows.reduce((s, r) => s + (Number(r.total_usd) || 0), 0)

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const rows = (acceptances ?? []).map((a: any) => {
    const quoteId = (a.quotes as any)?.id ?? a.quote_id
    const quoteNumber = (a.quotes as any)?.quote_number ?? '—'
    const qPayments = paymentsByQuote[quoteId] ?? []
    const qServices = servicesByQuote[quoteId] ?? []
    const qInvoices = invoicesByQuote[quoteId] ?? []

    // An issued invoice is a figure the client has been given, so it wins over
    // the quote's internal selling total — which can still move, and which knows
    // nothing about add-ons. Same rule as getTripBalance.
    const issued = qInvoices.filter((i) => i.status === 'issued')
    const totalSelling = issued.length > 0
      ? sum(issued)
      : Number((a.quote_versions as any)?.total_selling_usd ?? 0) + sum(qServices)

    const { receivedUsd: totalReceived } = computeBalance({ invoicedUsd: totalSelling, payments: qPayments })

    return {
      quoteId, quoteNumber, clientName: a.client_name, totalSelling, totalReceived,
      acceptedAt: a.accepted_at, payments: qPayments, services: qServices,
      invoices: qInvoices.map((i) => ({
        id: i.id,
        invoice_number: i.invoice_number,
        displayStatus: invoiceDisplayStatus({
          status: i.status,
          totalUsd: Number(i.total_usd) || 0,
          // Per-invoice allocation is the invoice screen's job; here the badge
          // only needs to distinguish a draft from a live document.
          receivedUsd: 0,
          dueDate: i.due_date,
        }),
      })),
    }
  })

  const directRows = (directBookings ?? []).map((b: any) => {
    const bServices = servicesByBooking[b.id] ?? []
    const bIssued = (invoicesByBooking[b.id] ?? []).filter((i) => i.status === 'issued')
    const amountDue = bIssued.length > 0
      ? sum(bIssued)
      : Number(b.total_price_usd ?? 0) + sum(bServices)

    const { receivedUsd: amountReceived } = computeBalance({
      invoicedUsd: amountDue, payments: paymentsByBooking[b.id] ?? [],
    })
    const tourTitle = (b.departures as any)?.tours?.title_en ?? 'Direct Booking'
    const startDate = (b.departures as any)?.start_date ?? null
    return { bookingId: b.id, tourTitle, startDate, amountDue, amountReceived, createdAt: b.created_at }
  })
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const totalInvoiced = rows.reduce((s, r) => s + r.totalSelling, 0)
    + directRows.reduce((s, r) => s + r.amountDue, 0)
  const totalReceived = rows.reduce((s, r) => s + r.totalReceived, 0)
    + directRows.reduce((s, r) => s + r.amountReceived, 0)
  const totalOutstanding = Math.max(totalInvoiced - totalReceived, 0)

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Finance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Customer receipts — invoiced vs received per accepted quote</p>
      </div>

      <FinanceNav active="/admin/finance/receipts" />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
          <p className="text-xs text-muted-foreground">Invoiced</p>
          <p className="text-2xl font-semibold text-foreground mt-1">${fmt(totalInvoiced)}</p>
          <p className="text-xs text-muted-foreground mt-1">{rows.length} accepted quote{rows.length !== 1 ? 's' : ''} + {directRows.length} direct booking{directRows.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
          <p className="text-xs text-muted-foreground">Received</p>
          <p className="text-2xl font-semibold text-green-700 mt-1">${fmt(totalReceived)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {totalInvoiced > 0 ? Math.round((totalReceived / totalInvoiced) * 100) : 0}% collected
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
          <p className="text-xs text-muted-foreground">Balance due</p>
          <p className={`text-2xl font-semibold mt-1 ${totalOutstanding > 0 ? 'text-warning-foreground' : 'text-muted-foreground'}`}>
            ${fmt(totalOutstanding)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {rows.filter(r => r.totalSelling - r.totalReceived > 0).length} with balance due
          </p>
        </div>
      </div>

      {/* Quote-based receipts */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/70">
          <h2 className="text-sm font-semibold text-foreground">Accepted quotes</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Click a row to see receipts or record a new one — received can never exceed invoiced</p>
        </div>
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No accepted quotes yet. Receipts are tracked once a client accepts a quote.
          </div>
        ) : (
          <ReceivablesTable rows={rows} catalogue={(catalogue ?? []) as unknown as Service[]} />
        )}
      </div>

      {/* Direct website bookings */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden mt-4">
        <div className="px-5 py-4 border-b border-border/70">
          <h2 className="text-sm font-semibold text-foreground">Direct website bookings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Confirmed bookings made without a quote — revenue only, no cost breakdown available</p>
        </div>
        {directRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No confirmed direct bookings yet.
          </div>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/70">
                <th className="px-5 py-3 font-medium">Tour / Departure</th>
                <th className="px-5 py-3 font-medium text-right">Amount Due</th>
                <th className="px-5 py-3 font-medium text-right">Received</th>
                <th className="px-5 py-3 font-medium text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {directRows.map((r) => {
                const outstanding = Math.max(r.amountDue - r.amountReceived, 0)
                return (
                  <tr key={r.bookingId} className="border-b border-gray-50 last:border-0">
                    <td data-label="Tour / Departure" className="px-5 py-3">
                      <p className="font-medium text-foreground">{r.tourTitle}</p>
                      {r.startDate && (
                        <p className="text-xs text-muted-foreground">{new Date(r.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      )}
                    </td>
                    <td data-label="Amount Due" className="px-5 py-3 text-right text-foreground">${fmt(r.amountDue)}</td>
                    <td data-label="Received" className="px-5 py-3 text-right text-green-700">${fmt(r.amountReceived)}</td>
                    <td data-label="Outstanding" className={`px-5 py-3 text-right font-semibold ${outstanding > 0 ? 'text-warning-foreground' : 'text-muted-foreground'}`}>
                      ${fmt(outstanding)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

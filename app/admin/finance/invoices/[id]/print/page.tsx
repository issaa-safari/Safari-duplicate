import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import { site } from '@/lib/site'
import PrintToolbar from './print-toolbar'
import { getInvoice } from '@/lib/server/invoices'
import { getTripPayments, resolveTripRef } from '@/lib/server/accounting'
import { allocatePayments } from '@/lib/invoice'

export const dynamic = 'force-dynamic'

const G = '#7A9A4A'

function money(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// This route lives under /admin, so it renders inside the admin layout's chrome.
// The document itself is painted white on top of it, and printing drops
// everything but <main> — the alternative, moving the route out of /admin, would
// mean re-implementing the admin auth gate for one page.
const CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; font-size: 13px; }
.sheet { background: #fff; max-width: 876px; margin: 16px auto 40px;
         box-shadow: 0 1px 3px rgba(0,0,0,.08); border-radius: 8px; }
.page { max-width: 780px; margin: 0 auto; padding: 40px 48px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
.head .co { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #666; }
.head h1 { font-size: 26px; margin: 6px 0 0; letter-spacing: 1px; }
.head .num { font-size: 15px; color: ${G}; font-weight: 600; margin-top: 2px; }
.rule { height: 3px; background: ${G}; width: 60px; margin: 14px 0 0; border-radius: 2px; }
.meta { text-align: right; font-size: 12px; color: #555; line-height: 1.7; }
.meta strong { color: #1a1a1a; }
.void { margin: 20px 0 0; padding: 10px 14px; border: 1px solid #b91c1c; color: #b91c1c;
        border-radius: 6px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; }
.parties { display: flex; gap: 40px; margin: 32px 0 8px; }
.parties > div { flex: 1; }
.parties h2 { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #888; margin: 0 0 8px; }
.parties p { margin: 0; line-height: 1.7; white-space: pre-line; }
table.lines { width: 100%; border-collapse: collapse; margin-top: 28px; font-size: 13px; }
table.lines th { text-align: left; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;
                 color: #888; border-bottom: 2px solid #e5e5e5; padding: 0 8px 8px; font-weight: 600; }
table.lines td { padding: 11px 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
table.lines .r { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
table.lines .ar { display: block; font-size: 11px; color: #777; margin-top: 2px; }
.totals { margin-left: auto; margin-top: 18px; width: 300px; font-size: 13px; }
.totals tr td { padding: 6px 8px; }
.totals .lbl { color: #666; }
.totals .r { text-align: right; font-variant-numeric: tabular-nums; }
.totals .grand td { border-top: 2px solid #e5e5e5; font-size: 16px; font-weight: 700; padding-top: 10px; }
.totals .due td { border-top: 1px solid #e5e5e5; font-weight: 700; color: ${G}; }
.pay { margin-top: 34px; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px 20px; background: #f9fbf5; }
.pay h2 { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #888; margin: 0 0 10px; }
.pay table { border-collapse: collapse; font-size: 12.5px; }
.pay td { padding: 3px 14px 3px 0; }
.pay .lbl { color: #666; white-space: nowrap; }
.note { margin-top: 26px; font-size: 12.5px; color: #444; line-height: 1.7; white-space: pre-line; }
.note h2 { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #888; margin: 0 0 6px; }
.foot { margin-top: 40px; padding-top: 14px; border-top: 1px solid #eee;
        text-align: center; font-size: 11px; color: #999; }
@media print {
  .no-print { display: none !important; }
  .admin-theme > *:not(main) { display: none !important; }
  .admin-theme, body { background: #fff !important; }
  main { padding: 0 !important; }
  .sheet { margin: 0; box-shadow: none; border-radius: 0; max-width: none; }
  .page { padding: 0; }
}
`

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const found = await getInvoice(admin, id)
  if (!found) notFound()

  const { invoice, lines } = found

  // A draft has no number and no issue date, so there is no document to print.
  if (invoice.status === 'draft') redirect(`/admin/finance/invoices/${id}`)

  const ref = await resolveTripRef(admin, {
    quoteId: invoice.quote_id,
    bookingId: invoice.booking_id,
  })

  const [{ data: settings }, { data: siblingRows }, payments] = await Promise.all([
    admin
      .from('company_settings')
      .select('company_name, bank_account_name, bank_account_number, bank_name, bank_account_type')
      .limit(1)
      .maybeSingle(),
    admin
      .from('invoices')
      .select('id, status')
      .or(
        [
          ref.quoteId ? `quote_id.eq.${ref.quoteId}` : null,
          ref.bookingId ? `booking_id.eq.${ref.bookingId}` : null,
        ]
          .filter(Boolean)
          .join(',')
      ),
    getTripPayments(admin, ref),
  ])

  const siblings = (siblingRows ?? []) as { id: string; status: 'draft' | 'issued' | 'void' }[]
  const { byInvoice } = allocatePayments(siblings, payments)

  const total = Number(invoice.total_usd) || 0
  const received = byInvoice[invoice.id] ?? 0
  const balance = Math.max(total - received, 0)
  const companyName = settings?.company_name || site.name

  return (
    <>
      <style>{CSS}</style>
      <PrintToolbar />
      <div className="sheet">
      <div className="page">
        <div className="head">
          <div>
            <div className="co">{companyName}</div>
            <h1>INVOICE</h1>
            <div className="num">{invoice.invoice_number}</div>
            <div className="rule" />
          </div>
          <div className="meta">
            <div>Issue date<br /><strong>{fmtDate(invoice.issue_date)}</strong></div>
            <div style={{ marginTop: 10 }}>Due date<br /><strong>{fmtDate(invoice.due_date)}</strong></div>
          </div>
        </div>

        {invoice.status === 'void' && (
          <div className="void">Void — {invoice.void_reason}</div>
        )}

        <div className="parties">
          <div>
            <h2>From</h2>
            <p>
              {companyName}
              {'\n'}
              {site.address.en}
              {'\n'}
              {site.email}
              {'\n'}
              {site.phoneDisplay}
            </p>
          </div>
          <div>
            <h2>Billed to</h2>
            <p>
              {invoice.client_name || '—'}
              {invoice.client_address ? `\n${invoice.client_address}` : ''}
              {invoice.client_email ? `\n${invoice.client_email}` : ''}
            </p>
          </div>
        </div>

        <table className="lines">
          <thead>
            <tr>
              <th>Description</th>
              <th className="r">Qty</th>
              <th className="r">Unit price</th>
              <th className="r">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.description_en}
                  {l.description_ar && <span className="ar" dir="auto">{l.description_ar}</span>}
                </td>
                <td className="r">{Number(l.quantity)}</td>
                <td className="r">${money(Number(l.unit_price_usd))}</td>
                <td className="r">${money(Number(l.total_usd))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="totals">
          <tbody>
            <tr className="grand">
              <td className="lbl">Total ({invoice.currency})</td>
              <td className="r">${money(total)}</td>
            </tr>
            {received !== 0 && (
              <tr>
                <td className="lbl">Received</td>
                <td className="r">−${money(received)}</td>
              </tr>
            )}
            <tr className="due">
              <td>Balance due</td>
              <td className="r">${money(balance)}</td>
            </tr>
          </tbody>
        </table>

        {(settings?.bank_name || settings?.bank_account_number) && balance > 0 && (
          <div className="pay">
            <h2>How to pay</h2>
            <table>
              <tbody>
                {settings.bank_account_name && (
                  <tr><td className="lbl">Account name</td><td>{settings.bank_account_name}</td></tr>
                )}
                {settings.bank_name && (
                  <tr><td className="lbl">Bank</td><td>{settings.bank_name}</td></tr>
                )}
                {settings.bank_account_number && (
                  <tr><td className="lbl">Account number</td><td>{settings.bank_account_number}</td></tr>
                )}
                {settings.bank_account_type && (
                  <tr><td className="lbl">Account type</td><td>{settings.bank_account_type}</td></tr>
                )}
                <tr><td className="lbl">Reference</td><td>{invoice.invoice_number}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {invoice.terms && (
          <div className="note">
            <h2>Payment terms</h2>
            {invoice.terms}
          </div>
        )}

        {invoice.notes && (
          <div className="note">
            <h2>Notes</h2>
            {invoice.notes}
          </div>
        )}

        <div className="foot">{companyName} · {site.email} · {site.url}</div>
      </div>
      </div>
    </>
  )
}

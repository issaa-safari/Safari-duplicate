'use client'

import { useState } from 'react'
import { useAction } from '@/lib/hooks/use-action'
import { Alert } from '@/components/ui/alert'
import {
  addInvoiceLine,
  deleteDraftInvoice,
  deleteInvoiceLine,
  issueInvoice,
  updateInvoice,
  voidInvoice,
} from '../actions'
import type { Invoice, InvoiceLine } from '@/lib/types'

function money(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * A draft is fully editable; anything issued is read-only, and the server says so
 * too — the guards live in Postgres, not here. This component only hides what the
 * database would refuse, so an operator is not offered a button that cannot work.
 */
export default function InvoiceEditor({
  invoice,
  lines,
}: {
  invoice: Invoice
  lines: InvoiceLine[]
}) {
  const { pending, run } = useAction()
  const [error, setError] = useState('')
  const [voiding, setVoiding] = useState(false)

  const isDraft = invoice.status === 'draft'
  const total = lines.reduce((sum, l) => sum + Number(l.total_usd || 0), 0)

  function submit(action: (fd: FormData) => Promise<void>, form: HTMLFormElement) {
    setError('')
    const fd = new FormData(form)
    run(async () => {
      try {
        await action(fd)
        form.reset()
      } catch (err) {
        // A redirect on success arrives here as a thrown control-flow signal;
        // only real failures carry a message worth showing.
        const message = err instanceof Error ? err.message : 'Something went wrong.'
        if (!message.includes('NEXT_REDIRECT')) setError(message)
      }
    })
  }

  const field =
    'w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring/50'
  const label = 'block text-xs font-medium text-muted-foreground mb-1'

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}

      {/* ── Who it is for ─────────────────────────────────────────────── */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(updateInvoice, e.currentTarget)
        }}
        className="rounded-xl border border-border bg-surface p-5 shadow-sm"
      >
        <input type="hidden" name="id" value={invoice.id} />
        <h2 className="mb-4 text-sm font-semibold text-foreground">Billed to</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="clientName" className={label}>Name</label>
            <input id="clientName" name="clientName" defaultValue={invoice.client_name ?? ''}
              disabled={!isDraft} className={field} />
          </div>
          <div>
            <label htmlFor="clientEmail" className={label}>Email</label>
            <input id="clientEmail" name="clientEmail" type="email" defaultValue={invoice.client_email ?? ''}
              disabled={!isDraft} className={field} />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="clientAddress" className={label}>Address</label>
          <textarea id="clientAddress" name="clientAddress" rows={2} defaultValue={invoice.client_address ?? ''}
            disabled={!isDraft} className={field} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dueDate" className={label}>Due date</label>
            <input id="dueDate" name="dueDate" type="date" defaultValue={invoice.due_date ?? ''}
              disabled={!isDraft} className={field} />
            <p className="mt-1 text-xs text-muted-foreground">
              Left blank, issuing sets it from the payment terms in Settings.
            </p>
          </div>
          <div>
            <label htmlFor="terms" className={label}>Payment terms</label>
            <input id="terms" name="terms" defaultValue={invoice.terms ?? ''}
              placeholder="Bank transfer within 14 days" disabled={!isDraft} className={field} />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="notes" className={label}>Notes to the client</label>
          <textarea id="notes" name="notes" rows={2} defaultValue={invoice.notes ?? ''}
            disabled={!isDraft} className={field} />
        </div>

        {isDraft && (
          <button type="submit" disabled={pending}
            className="mt-4 rounded bg-olive px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pending ? 'Saving…' : 'Save details'}
          </button>
        )}
      </form>

      {/* ── The lines ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Lines</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pre-filled from the trip and its add-on services. A discount is a negative line.
          </p>
        </div>

        <table className="stack-table w-full text-sm">
          <thead>
            <tr className="border-b border-border/70 text-left text-xs text-muted-foreground">
              <th className="px-5 py-3 font-medium">Description</th>
              <th className="px-5 py-3 text-right font-medium">Qty</th>
              <th className="px-5 py-3 text-right font-medium">Unit</th>
              <th className="px-5 py-3 text-right font-medium">Total</th>
              {isDraft && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={isDraft ? 5 : 4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No lines yet — add one below.
                </td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.id} className="border-b border-border/40 last:border-0">
                  <td data-label="Description" className="px-5 py-3">
                    <p className="text-foreground">{l.description_en}</p>
                    {l.description_ar && (
                      <p dir="auto" className="mt-0.5 text-xs text-muted-foreground">{l.description_ar}</p>
                    )}
                  </td>
                  <td data-label="Qty" className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                    {Number(l.quantity)}
                  </td>
                  <td data-label="Unit" className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                    ${money(Number(l.unit_price_usd))}
                  </td>
                  <td data-label="Total" className="px-5 py-3 text-right font-medium tabular-nums text-foreground">
                    ${money(Number(l.total_usd))}
                  </td>
                  {isDraft && (
                    <td className="px-5 py-3 text-right">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          submit(deleteInvoiceLine, e.currentTarget)
                        }}
                      >
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="invoiceId" value={invoice.id} />
                        <button type="submit" disabled={pending}
                          className="text-xs text-destructive hover:underline disabled:opacity-50">
                          Remove
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-border">
              <td colSpan={3} className="px-5 py-3 text-right text-sm font-medium text-muted-foreground">
                Total
              </td>
              <td className="px-5 py-3 text-right text-base font-semibold tabular-nums text-foreground">
                ${money(total)}
              </td>
              {isDraft && <td />}
            </tr>
          </tfoot>
        </table>

        {isDraft && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(addInvoiceLine, e.currentTarget)
            }}
            className="border-t border-border/70 bg-surface-alt p-5"
          >
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
              <div>
                <label htmlFor="description" className={label}>Description</label>
                <input id="description" name="description" required placeholder="Airport transfer" className={field} />
              </div>
              <div>
                <label htmlFor="quantity" className={label}>Qty</label>
                <input id="quantity" name="quantity" type="number" step="0.01" defaultValue="1" className={field} />
              </div>
              <div>
                <label htmlFor="unitPrice" className={label}>Unit price (USD)</label>
                <input id="unitPrice" name="unitPrice" type="number" step="0.01" required placeholder="0.00" className={field} />
              </div>
              <button type="submit" disabled={pending}
                className="rounded border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface disabled:opacity-50">
                Add line
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Issuing, voiding, discarding ──────────────────────────────── */}
      {isDraft && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(issueInvoice, e.currentTarget)
            }}
          >
            <input type="hidden" name="id" value={invoice.id} />
            <button type="submit" disabled={pending || lines.length === 0}
              className="rounded bg-olive px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
              {pending ? 'Working…' : 'Issue invoice'}
            </button>
          </form>
          <p className="text-xs text-muted-foreground">
            Draws the next number and freezes the document. After that it can only be voided.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(deleteDraftInvoice, e.currentTarget)
            }}
            className="ms-auto"
          >
            <input type="hidden" name="id" value={invoice.id} />
            <button type="submit" disabled={pending} className="text-sm text-destructive hover:underline disabled:opacity-50">
              Discard draft
            </button>
          </form>
        </div>
      )}

      {invoice.status === 'issued' && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          {voiding ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                submit(voidInvoice, e.currentTarget)
              }}
              className="space-y-3"
            >
              <input type="hidden" name="id" value={invoice.id} />
              <div>
                <label htmlFor="reason" className={label}>Why is it being voided?</label>
                <input id="reason" name="reason" required placeholder="Wrong traveller count" className={field} />
                <p className="mt-1 text-xs text-muted-foreground">
                  The number stays spoken for and the reason stays on the record.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={pending}
                  className="rounded bg-destructive px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {pending ? 'Voiding…' : 'Void invoice'}
                </button>
                <button type="button" onClick={() => setVoiding(false)}
                  className="text-sm text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setVoiding(true)}
              className="text-sm text-destructive hover:underline">
              Void this invoice
            </button>
          )}
        </div>
      )}
    </div>
  )
}

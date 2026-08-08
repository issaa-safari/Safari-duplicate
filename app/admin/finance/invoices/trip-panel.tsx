'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAction } from '@/lib/hooks/use-action'
import { Alert } from '@/components/ui/alert'
import InvoiceStatusBadge from './status-badge'
import { generateInvoice } from './actions'
import type { InvoiceDisplayStatus } from '@/lib/types'

/**
 * The invoices raised against one trip, and the button that raises another.
 *
 * Generating pre-fills a draft from the trip price and its add-on services, so
 * the sequence an operator actually follows — add the visas, then invoice — puts
 * them on the document without anything being re-keyed.
 */
export default function TripInvoicesPanel({
  quoteId,
  bookingId,
  invoices,
}: {
  quoteId?: string | null
  bookingId?: string | null
  invoices: { id: string; invoice_number: string | null; displayStatus: InvoiceDisplayStatus }[]
}) {
  const { pending, run } = useAction()
  const [error, setError] = useState('')

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    run(async () => {
      try {
        await generateInvoice(fd)
      } catch (err) {
        // Success redirects to the new draft, which arrives here as a throw.
        const message = err instanceof Error ? err.message : 'Something went wrong.'
        if (!message.includes('NEXT_REDIRECT')) setError(message)
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground">Invoices</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          What this trip has been formally asked for. A draft can be edited; an issued invoice can only
          be voided.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">None raised yet.</p>
      ) : (
        <div className="space-y-1.5">
          {invoices.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
              <Link href={`/admin/finance/invoices/${i.id}`} className="font-medium text-foreground hover:underline">
                {i.invoice_number ?? 'Draft invoice'}
              </Link>
              <InvoiceStatusBadge status={i.displayStatus} />
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="mt-4 border-t border-border pt-4">
        {quoteId && <input type="hidden" name="quoteId" value={quoteId} />}
        {bookingId && <input type="hidden" name="bookingId" value={bookingId} />}
        <button type="submit" disabled={pending}
          className="text-sm font-medium text-olive hover:underline disabled:opacity-50">
          {pending ? 'Generating…' : '+ Generate invoice'}
        </button>
        <p className="mt-1 text-xs text-muted-foreground">
          Starts a draft with the trip price and every add-on already on it.
        </p>
      </form>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useAction } from '@/lib/hooks/use-action'
import { Alert } from '@/components/ui/alert'
import PaymentForm, { type EditablePayment } from './payment-form'
import { deletePayment } from './actions'

/**
 * Edit and delete controls for one recorded receipt, dropped into whichever list
 * is showing it — the booking screen, the receipts row, the invoice page.
 *
 * Correcting is not refunding. Money genuinely going back to a client is its own
 * ledger row with payment_type 'refund'; these controls are for a receipt that
 * was mistyped or never should have been entered. Deleting writes the whole row
 * to activity_log first, so it is recoverable by hand and never silent.
 */
export default function PaymentActions({
  payment,
  quoteId,
  bookingId,
  invoiceId,
  label,
  totalSelling,
  alreadyReceived,
}: {
  payment: EditablePayment
  quoteId?: string
  bookingId?: string
  invoiceId?: string
  label: string
  totalSelling: number
  alreadyReceived: number
}) {
  const { pending, run } = useAction()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  function remove() {
    setError('')
    const fd = new FormData()
    fd.set('id', payment.id)
    run(async () => {
      try {
        const result = await deletePayment(fd)
        if (result?.error) {
          setError(result.error)
          return
        }
        setConfirming(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not delete the payment.')
      }
    })
  }

  if (editing) {
    return (
      <div className="mt-2 max-w-md rounded-lg border border-border bg-surface p-3">
        <PaymentForm
          quoteId={quoteId}
          bookingId={bookingId}
          invoiceId={invoiceId}
          label={label}
          totalSelling={totalSelling}
          alreadyReceived={alreadyReceived}
          payment={payment}
          onDone={() => { setEditing(false); window.location.reload() }}
        />
      </div>
    )
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <Alert variant="error">{error}</Alert>}

      {confirming ? (
        <>
          <span className="text-xs text-muted-foreground">Delete this receipt?</span>
          <button type="button" onClick={remove} disabled={pending}
            className="text-xs font-medium text-destructive hover:underline disabled:opacity-50">
            {pending ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button type="button" onClick={() => setConfirming(false)}
            className="text-xs text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => setEditing(true)}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline">
            Edit
          </button>
          <button type="button" onClick={() => setConfirming(true)}
            className="text-xs text-muted-foreground hover:text-destructive hover:underline">
            Delete
          </button>
        </>
      )}
    </span>
  )
}

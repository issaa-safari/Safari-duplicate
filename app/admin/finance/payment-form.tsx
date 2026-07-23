'use client'

import { useState } from 'react'
import { useAction } from '@/lib/hooks/use-action'
import { recordPayment } from './actions'
import { Alert } from '@/components/ui/alert'

export default function PaymentForm({
  quoteId,
  quoteNumber,
  totalSelling,
  alreadyReceived,
  onDone,
}: {
  quoteId: string
  quoteNumber: string
  totalSelling: number
  alreadyReceived: number
  onDone: () => void
}) {
  const { pending, run } = useAction()
  const [error, setError] = useState('')
  const outstanding = Math.max(totalSelling - alreadyReceived, 0)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('quoteId', quoteId)
    run(async () => {
      try {
        await recordPayment(fd)
        onDone()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="text-xs text-muted-foreground mb-1">
        Quote <span className="font-mono">{quoteNumber}</span> — outstanding:{' '}
        <span className="font-semibold text-foreground">${outstanding.toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="amount" className="block text-xs text-muted-foreground mb-1">Amount (USD)</label>
          <input id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={outstanding > 0 ? outstanding.toFixed(2) : ''}
            required
            className="w-full rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring/50"
          />
        </div>
        <div>
          <label htmlFor="receivedAt" className="block text-xs text-muted-foreground mb-1">Date received</label>
          <input id="receivedAt"
            name="receivedAt"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
            className="w-full rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="paymentType" className="block text-xs text-muted-foreground mb-1">Type</label>
          <select id="paymentType"
            name="paymentType"
            className="w-full rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring/50"
          >
            <option value="deposit">Deposit</option>
            <option value="balance">Balance</option>
            <option value="full">Full payment</option>
            <option value="partial">Partial</option>
            <option value="refund">Refund</option>
          </select>
        </div>
        <div>
          <label htmlFor="method" className="block text-xs text-muted-foreground mb-1">Method</label>
          <select id="method"
            name="method"
            className="w-full rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring/50"
          >
            <option value="">— select —</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="card">Card</option>
            <option value="mpesa">M-Pesa</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="reference" className="block text-xs text-muted-foreground mb-1">Reference / notes</label>
        <input id="reference"
          name="reference"
          type="text"
          placeholder="Bank ref, receipt no, etc."
          className="w-full rounded border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring/50"
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded py-2 text-sm font-medium text-white bg-olive disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Record Payment'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-4 rounded py-2 text-sm text-muted-foreground border border-border hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

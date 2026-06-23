'use client'

import { useState, useTransition } from 'react'
import { recordPayment } from './actions'

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
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const outstanding = Math.max(totalSelling - alreadyReceived, 0)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('quoteId', quoteId)
    startTransition(async () => {
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
      <div className="text-xs text-gray-500 mb-1">
        Quote <span className="font-mono">{quoteNumber}</span> — outstanding:{' '}
        <span className="font-semibold text-gray-800">${outstanding.toLocaleString()}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Amount (USD)</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={outstanding > 0 ? outstanding.toFixed(2) : ''}
            required
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#7A9A4A]"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date received</label>
          <input
            name="receivedAt"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#7A9A4A]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select
            name="paymentType"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#7A9A4A]"
          >
            <option value="deposit">Deposit</option>
            <option value="balance">Balance</option>
            <option value="full">Full payment</option>
            <option value="partial">Partial</option>
            <option value="refund">Refund</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Method</label>
          <select
            name="method"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#7A9A4A]"
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
        <label className="block text-xs text-gray-500 mb-1">Reference / notes</label>
        <input
          name="reference"
          type="text"
          placeholder="Bank ref, receipt no, etc."
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#7A9A4A]"
        />
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#7A9A4A' }}
        >
          {pending ? 'Saving…' : 'Record Payment'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-4 rounded py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

'use client'

import { useState, useTransition } from 'react'

export default function AcceptForm({
  deliveryId,
  versionId,
  quoteId,
  clientName,
}: {
  deliveryId: string
  versionId: string
  quoteId: string
  clientName: string
}) {
  const [name, setName] = useState(clientName)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [declined, setDeclined] = useState(false)
  const [pending, startTransition] = useTransition()
  const [decliningPending, startDeclineTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) { setError('Please accept the terms to proceed.'); return }
    if (!name.trim()) { setError('Please enter your name.'); return }
    setError('')

    startTransition(async () => {
      try {
        const res = await fetch('/api/quote/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deliveryId, versionId, quoteId, clientName: name }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to accept quote.')
        window.location.reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  function handleDecline() {
    if (!confirm('Are you sure you want to decline this quote? This cannot be undone.')) return
    setError('')
    startDeclineTransition(async () => {
      try {
        const res = await fetch('/api/quote/decline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deliveryId, versionId, quoteId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Failed to decline quote.')
        setDeclined(true)
        window.location.reload()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  if (declined) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
        You have declined this quote. Our team has been notified.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]"
          placeholder="Full name"
          required
        />
      </div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#7A9A4A] focus:ring-[#7A9A4A]"
        />
        <span className="text-sm text-gray-600">
          I agree to the terms of this quote and confirm I wish to proceed with booking.
        </span>
      </label>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
      <button
        type="submit"
        disabled={pending || decliningPending || !agreed}
        className="w-full rounded-md py-3 text-sm font-semibold text-white disabled:opacity-50 transition"
        style={{ backgroundColor: '#7A9A4A' }}
      >
        {pending ? 'Processing…' : 'Accept Quote & Proceed to Booking'}
      </button>
      <div className="text-center">
        <button
          type="button"
          onClick={handleDecline}
          disabled={pending || decliningPending}
          className="text-xs text-gray-400 hover:text-red-500 transition disabled:opacity-40"
        >
          {decliningPending ? 'Declining…' : 'Not interested — decline this quote'}
        </button>
      </div>
    </form>
  )
}

'use client'

import { useState, useTransition } from 'react'

export default function AcceptForm({
  deliveryId,
  versionId,
  quoteId,
  clientName,
  onAccepted,
}: {
  deliveryId: string
  versionId: string
  quoteId: string
  clientName: string
  onAccepted: () => void
}) {
  const [name, setName] = useState(clientName)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

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
        onAccepted()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
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
        disabled={pending || !agreed}
        className="w-full rounded-md py-3 text-sm font-semibold text-white disabled:opacity-50 transition"
        style={{ backgroundColor: '#7A9A4A' }}
      >
        {pending ? 'Processing…' : 'Accept Quote & Proceed to Booking'}
      </button>
    </form>
  )
}

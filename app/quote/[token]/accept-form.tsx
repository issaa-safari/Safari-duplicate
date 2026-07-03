'use client'

import { useState, useTransition } from 'react'

interface TrackOption {
  versionId: string
  label: string
  totalUsd: number
}

export default function AcceptForm({
  deliveryId,
  versionId,
  quoteId,
  clientName,
  tracks,
}: {
  deliveryId: string
  versionId: string
  quoteId: string
  clientName: string
  /** Dual-track proposals: the client picks which package to accept */
  tracks?: TrackOption[]
}) {
  const [name, setName] = useState(clientName)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [declined, setDeclined] = useState(false)
  const [chosenVersionId, setChosenVersionId] = useState(versionId)
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
          body: JSON.stringify({ deliveryId, versionId: chosenVersionId, quoteId, clientName: name }),
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
      {tracks && tracks.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Which package would you like?</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tracks.map(t => (
              <label
                key={t.versionId}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition ${
                  chosenVersionId === t.versionId
                    ? 'border-[#7A9A4A] bg-[#7A9A4A]/5'
                    : 'border-gray-200 hover:border-[#7A9A4A]/50'
                }`}
              >
                <input
                  type="radio"
                  name="track"
                  checked={chosenVersionId === t.versionId}
                  onChange={() => setChosenVersionId(t.versionId)}
                  className="h-4 w-4 text-[#7A9A4A] focus:ring-[#7A9A4A]"
                />
                <span className="text-sm font-medium text-gray-800">{t.label}</span>
                <span className="ml-auto text-sm font-semibold text-gray-900">
                  ${t.totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
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

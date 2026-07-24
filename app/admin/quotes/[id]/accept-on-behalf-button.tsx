'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from '@/lib/hooks/use-action'
import { acceptQuoteOnBehalf } from './accept-actions'

export default function AcceptOnBehalfButton({ quoteId, status }: { quoteId: string; status: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const { pending, run } = useAction()

  // Once accepted there's nothing to do here.
  if (status === 'accepted') return null

  function handleClick() {
    setError('')
    if (!window.confirm('Accept this quote on the client’s behalf? This confirms the itinerary and creates a booking.')) return
    run(async () => {
      try {
        await acceptQuoteOnBehalf(quoteId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not accept the quote.')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center rounded-lg bg-primary-strong px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-strong-hover disabled:opacity-60"
      >
        {pending ? 'Accepting…' : 'Mark as Accepted'}
      </button>
      {error && <p className="max-w-xs text-right text-xs text-destructive">{error}</p>}
    </div>
  )
}

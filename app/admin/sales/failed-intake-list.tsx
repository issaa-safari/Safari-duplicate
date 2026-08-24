'use client'

import { useState, useTransition } from 'react'
import { RotateCcw } from 'lucide-react'
import { retryFailedIntake } from './actions'

export type FailedIntakeRow = {
  id: string
  channel: string
  error_message: string | null
  attempts: number
  received_at: string
}

export default function FailedIntakeList({ events }: { events: FailedIntakeRow[] }) {
  const [pending, startTransition] = useTransition()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function retry(eventId: string) {
    setError(null)
    setActiveId(eventId)
    startTransition(async () => {
      const result = await retryFailedIntake(eventId)
      if (!result.ok) setError(result.error)
      setActiveId(null)
    })
  }

  return (
    <div className="mt-3">
      <ul className="space-y-2 text-xs">
        {events.map(event => (
          <li key={event.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-red-200 bg-white/60 px-3 py-2">
            <span className="font-medium">{event.channel.replaceAll('_', ' ')}</span>
            <span>{new Date(event.received_at).toLocaleString('en-GB')}</span>
            <span>attempt {event.attempts}</span>
            {event.error_message && <span className="min-w-0 flex-1 truncate text-red-700">{event.error_message}</span>}
            <button
              type="button"
              disabled={pending}
              onClick={() => retry(event.id)}
              className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
            >
              <RotateCcw size={12} aria-hidden />
              {pending && activeId === event.id ? 'Retrying…' : 'Retry'}
            </button>
          </li>
        ))}
      </ul>
      {error ? <p role="alert" className="mt-2 text-xs font-medium text-red-800">{error}</p> : null}
    </div>
  )
}

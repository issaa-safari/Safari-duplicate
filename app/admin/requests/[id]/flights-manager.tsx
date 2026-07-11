'use client'

import { useState, useTransition } from 'react'
import { addFlight, deleteFlight } from './flight-actions'

interface Flight {
  id: string
  traveller_name: string | null
  direction: string
  flight_number: string | null
  airline: string | null
  airport: string | null
  scheduled_at: string | null
  notes: string | null
}

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

export default function FlightsManager({ requestId, flights: initial }: { requestId: string; flights: Flight[] }) {
  const [flights, setFlights] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('requestId', requestId)
    startTransition(async () => {
      try {
        await addFlight(fd)
        setShowAdd(false)
        // Optimistic: reflect immediately; server revalidate will reconcile.
        setFlights(fs => [...fs, {
          id: crypto.randomUUID(),
          traveller_name: (fd.get('travellerName') as string) || null,
          direction: (fd.get('direction') as string) || 'arrival',
          flight_number: (fd.get('flightNumber') as string) || null,
          airline: (fd.get('airline') as string) || null,
          airport: (fd.get('airport') as string) || null,
          scheduled_at: (fd.get('scheduledAt') as string) || null,
          notes: (fd.get('notes') as string) || null,
        }])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add flight.')
      }
    })
  }

  function handleDelete(id: string) {
    const fd = new FormData()
    fd.set('id', id)
    fd.set('requestId', requestId)
    startTransition(async () => {
      await deleteFlight(fd)
      setFlights(fs => fs.filter(f => f.id !== id))
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Flights</h2>
        {!showAdd && (
          <button onClick={() => { setShowAdd(true); setError('') }}
            className="text-xs text-[var(--olive)] hover:text-[var(--olive-dk)] font-medium">
            + Add Flight
          </button>
        )}
      </div>

      {flights.length === 0 && !showAdd && (
        <p className="text-xs text-muted-foreground">No flights recorded yet.</p>
      )}

      <ul className="space-y-2 mb-4">
        {flights.map(f => (
          <li key={f.id} className="flex items-start gap-3 group border border-gray-100 rounded-md p-3">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase shrink-0 ${
              f.direction === 'departure' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {f.direction === 'departure' ? '↑ Dep' : '↓ Arr'}
            </span>
            <div className="flex-1 min-w-0 text-sm">
              <p className="text-gray-800 font-medium">
                {[f.airline, f.flight_number].filter(Boolean).join(' ') || 'Flight'}
                {f.traveller_name && <span className="text-muted-foreground font-normal"> · {f.traveller_name}</span>}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {f.scheduled_at && new Date(f.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                {f.airport && ` · ${f.airport}`}
              </p>
              {f.notes && <p className="text-xs text-muted-foreground mt-0.5">{f.notes}</p>}
            </div>
            <button onClick={() => handleDelete(f.id)} disabled={pending}
              className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs shrink-0" aria-label="Delete">✕</button>
          </li>
        ))}
      </ul>

      {showAdd && (
        <form onSubmit={handleAdd} className="space-y-2 border-t border-gray-100 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <select name="direction" className={inputCls} defaultValue="arrival">
              <option value="arrival">Arrival</option>
              <option value="departure">Departure</option>
            </select>
            <input name="travellerName" placeholder="Traveller (optional)" className={inputCls} />
            <input name="airline" placeholder="Airline" className={inputCls} />
            <input name="flightNumber" placeholder="Flight no." className={inputCls} />
            <input name="airport" placeholder="Airport" className={inputCls} />
            <input name="scheduledAt" type="datetime-local" className={inputCls} />
          </div>
          <input name="notes" placeholder="Notes (optional)" className={inputCls} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 bg-olive hover:bg-olive-dk">
              {pending ? 'Saving…' : 'Add Flight'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setError('') }}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

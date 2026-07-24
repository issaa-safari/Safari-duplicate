'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAction } from '@/lib/hooks/use-action'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { createManualBooking } from './actions'

export interface DepartureOption {
  id: string
  label: string
  startDate: string
  endDate: string
  seatsLeft: number
  price: number
  status: string
}

interface TravellerRow {
  firstName: string
  lastName: string
  email: string
  phone: string
  nationality: string
  passportNumber: string
  dateOfBirth: string
}

const emptyTraveller = (): TravellerRow => ({
  firstName: '', lastName: '', email: '', phone: '', nationality: '', passportNumber: '', dateOfBirth: '',
})

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function NewBookingForm({ departures, preselectId }: { departures: DepartureOption[]; preselectId: string | null }) {
  const [departureId, setDepartureId] = useState(preselectId ?? '')
  const [status, setStatus] = useState('confirmed')
  const [travellers, setTravellers] = useState<TravellerRow[]>([emptyTraveller()])
  const [priceEdited, setPriceEdited] = useState(false)
  const [price, setPrice] = useState('')
  const [error, setError] = useState('')
  const { pending, run } = useAction()

  const selected = useMemo(() => departures.find(d => d.id === departureId) ?? null, [departures, departureId])

  // Auto-suggest total = per-seat price × travellers until the user edits it.
  const suggestedTotal = selected ? selected.price * travellers.length : 0
  const effectivePrice = priceEdited ? price : (selected ? String(suggestedTotal) : '')

  function updateTraveller(i: number, patch: Partial<TravellerRow>) {
    setTravellers(ts => ts.map((t, idx) => idx === i ? { ...t, ...patch } : t))
  }
  function addTraveller() { setTravellers(ts => [...ts, emptyTraveller()]) }
  function removeTraveller(i: number) { setTravellers(ts => ts.length > 1 ? ts.filter((_, idx) => idx !== i) : ts) }

  const overCapacity = selected != null && travellers.length > selected.seatsLeft

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!departureId) { setError('Please choose a departure.'); return }
    if (overCapacity) { setError(`Only ${selected?.seatsLeft} seat(s) left on this departure.`); return }
    if (!travellers[0]?.email.trim()) { setError('The lead traveller needs an email address.'); return }

    const fd = new FormData()
    fd.set('departureId', departureId)
    fd.set('status', status)
    fd.set('totalPrice', effectivePrice || '0')
    fd.set('travellers', JSON.stringify(travellers))
    run(async () => {
      try {
        await createManualBooking(fd) // redirects to the new booking on success
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create the booking.')
      }
    })
  }

  if (departures.length === 0) {
    return (
      <Alert variant="error">
        No active departures to book onto.{' '}
        <Link href="/admin/departures/new" className="underline">Create a departure</Link> first.
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Departure + status */}
      <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
        <div>
          <label htmlFor="departure" className="block text-sm font-medium text-foreground mb-1">Departure</label>
          <select id="departure" value={departureId} onChange={e => setDepartureId(e.target.value)} className={inputCls} required>
            <option value="">— Choose a departure —</option>
            {departures.map(d => (
              <option key={d.id} value={d.id} disabled={d.seatsLeft <= 0}>
                {d.label} · {fmtDate(d.startDate)} · {d.seatsLeft} seat{d.seatsLeft !== 1 ? 's' : ''} left
                {d.seatsLeft <= 0 ? ' — full' : ''}
              </option>
            ))}
          </select>
          {selected && (
            <p className="mt-1 text-xs text-muted-foreground">
              {fmtDate(selected.startDate)} → {fmtDate(selected.endDate)} · ${selected.price.toLocaleString()}/seat · {selected.seatsLeft} available
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-foreground mb-1">Status</label>
            <select id="status" value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label htmlFor="totalPrice" className="block text-sm font-medium text-foreground mb-1">Total price (USD)</label>
            <input id="totalPrice" type="number" min={0} step="0.01" value={effectivePrice}
              onChange={e => { setPriceEdited(true); setPrice(e.target.value) }}
              className={inputCls} placeholder="0.00" />
            {selected && !priceEdited && (
              <p className="mt-1 text-[11px] text-muted-foreground">Auto: ${selected.price.toLocaleString()} × {travellers.length}</p>
            )}
          </div>
        </div>
      </div>

      {/* Travellers */}
      <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Travellers <span className="font-normal text-muted-foreground">({travellers.length})</span>
          </h2>
          <button type="button" onClick={addTraveller} className="text-sm font-medium text-brand-text hover:underline">
            + Add traveller
          </button>
        </div>
        <div className="space-y-5">
          {travellers.map((t, i) => (
            <div key={i} className="rounded-lg border border-border/70 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {i === 0 ? 'Lead traveller' : `Traveller ${i + 1}`}
                </span>
                {i > 0 && (
                  <button type="button" onClick={() => removeTraveller(i)} className="text-xs text-muted-foreground hover:text-destructive">
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={t.firstName} onChange={e => updateTraveller(i, { firstName: e.target.value })} placeholder="First name" className={inputCls} />
                <input value={t.lastName} onChange={e => updateTraveller(i, { lastName: e.target.value })} placeholder="Last name" className={inputCls} />
                <input value={t.email} onChange={e => updateTraveller(i, { email: e.target.value })} placeholder={i === 0 ? 'Email (required)' : 'Email'} type="email" className={inputCls} />
                <input value={t.phone} onChange={e => updateTraveller(i, { phone: e.target.value })} placeholder="Phone" className={inputCls} />
                <input value={t.nationality} onChange={e => updateTraveller(i, { nationality: e.target.value })} placeholder="Nationality" className={inputCls} />
                <input value={t.passportNumber} onChange={e => updateTraveller(i, { passportNumber: e.target.value })} placeholder="Passport no." className={inputCls} />
              </div>
              <div className="mt-2">
                <label className="block text-[11px] text-muted-foreground mb-1">Date of birth</label>
                <input value={t.dateOfBirth} onChange={e => updateTraveller(i, { dateOfBirth: e.target.value })} type="date" className={inputCls} />
              </div>
            </div>
          ))}
        </div>
        {overCapacity && (
          <p className="mt-3 text-sm text-destructive">
            That&rsquo;s {travellers.length} travellers but only {selected?.seatsLeft} seat(s) remain.
          </p>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex gap-3">
        <Button type="submit" loading={pending} loadingText="Creating…" disabled={overCapacity}>Create booking</Button>
        <ButtonLink href="/admin/bookings">Cancel</ButtonLink>
      </div>
    </form>
  )
}

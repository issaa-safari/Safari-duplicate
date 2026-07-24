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
  isRider: boolean
  emergencyContact: string
}

const emptyTraveller = (): TravellerRow => ({
  firstName: '', lastName: '', email: '', phone: '', nationality: '',
  passportNumber: '', dateOfBirth: '', isRider: true, emergencyContact: '',
})

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function money(n: number) {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export default function NewBookingForm({ departures, preselectId }: { departures: DepartureOption[]; preselectId: string | null }) {
  const [departureId, setDepartureId] = useState(preselectId ?? '')
  const [status, setStatus] = useState('confirmed')
  const [travellers, setTravellers] = useState<TravellerRow[]>([emptyTraveller()])
  const [priceEdited, setPriceEdited] = useState(false)
  const [price, setPrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [depositMethod, setDepositMethod] = useState('')
  const [depositReference, setDepositReference] = useState('')
  const [error, setError] = useState('')
  const { pending, run } = useAction()

  const selected = useMemo(() => departures.find(d => d.id === departureId) ?? null, [departures, departureId])

  // Auto-suggest total = per-seat price × travellers until the user edits it.
  const suggestedTotal = selected ? selected.price * travellers.length : 0
  const effectivePrice = priceEdited ? price : (selected ? String(suggestedTotal) : '')
  const totalNum = Number(effectivePrice) || 0
  const depositNum = Number(deposit) || 0
  const balance = Math.max(0, totalNum - depositNum)

  function updateTraveller(i: number, patch: Partial<TravellerRow>) {
    setTravellers(ts => ts.map((t, idx) => idx === i ? { ...t, ...patch } : t))
  }
  function setCount(n: number) {
    setTravellers(ts => {
      if (n === ts.length) return ts
      if (n < ts.length) return ts.slice(0, n)
      return [...ts, ...Array.from({ length: n - ts.length }, emptyTraveller)]
    })
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
    if (depositNum > totalNum) { setError('Deposit cannot exceed the total price.'); return }

    const fd = new FormData()
    fd.set('departureId', departureId)
    fd.set('status', status)
    fd.set('totalPrice', effectivePrice || '0')
    fd.set('deposit', deposit || '0')
    fd.set('depositMethod', depositMethod)
    fd.set('depositReference', depositReference)
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
      {/* Departure */}
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
              {fmtDate(selected.startDate)} → {fmtDate(selected.endDate)} · {money(selected.price)}/seat · {selected.seatsLeft} available
            </p>
          )}
        </div>

        {/* Number of travellers quick-select (mirrors the public Book Now page) */}
        <div>
          <span className="block text-sm font-medium text-foreground mb-2">Number of travellers</span>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {Array.from({ length: 8 }, (_, i) => i + 1).map(n => {
              const disabled = selected != null && n > selected.seatsLeft
              const active = travellers.length === n
              return (
                <button type="button" key={n} disabled={disabled} onClick={() => setCount(n)}
                  className={`rounded-md border px-2 py-2 text-sm font-medium transition ${
                    active ? 'border-primary-strong bg-primary-strong text-white'
                    : disabled ? 'border-border text-muted-foreground/40 cursor-not-allowed'
                    : 'border-border text-foreground hover:border-primary-strong/50'}`}>
                  {n}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Travellers */}
      <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Traveller information <span className="font-normal text-muted-foreground">({travellers.length})</span>
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
                  {i === 0 ? 'Traveller 1 · Lead' : `Traveller ${i + 1}`}
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input type="checkbox" checked={t.isRider} onChange={e => updateTraveller(i, { isRider: e.target.checked })} className="rounded border-border" />
                    Rider
                  </label>
                  {i > 0 && (
                    <button type="button" onClick={() => removeTraveller(i)} className="text-xs text-muted-foreground hover:text-destructive">
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={t.firstName} onChange={e => updateTraveller(i, { firstName: e.target.value })} placeholder="First name" className={inputCls} />
                <input value={t.lastName} onChange={e => updateTraveller(i, { lastName: e.target.value })} placeholder="Last name" className={inputCls} />
                <input value={t.email} onChange={e => updateTraveller(i, { email: e.target.value })} placeholder={i === 0 ? 'Email (required)' : 'Email'} type="email" className={inputCls} />
                <input value={t.phone} onChange={e => updateTraveller(i, { phone: e.target.value })} placeholder="Phone" className={inputCls} />
                <input value={t.nationality} onChange={e => updateTraveller(i, { nationality: e.target.value })} placeholder="Nationality" className={inputCls} />
                <input value={t.passportNumber} onChange={e => updateTraveller(i, { passportNumber: e.target.value })} placeholder="Passport no." className={inputCls} />
                <input value={t.emergencyContact} onChange={e => updateTraveller(i, { emergencyContact: e.target.value })} placeholder="Emergency contact" className={inputCls} />
                <div>
                  <input value={t.dateOfBirth} onChange={e => updateTraveller(i, { dateOfBirth: e.target.value })} type="date" className={inputCls} aria-label="Date of birth" />
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">Date of birth</span>
                </div>
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

      {/* Price + payment */}
      <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
        <div className="rounded-lg bg-surface-alt p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Price per person</span>
            <span className="font-medium text-foreground">{selected ? money(selected.price) : '—'}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-muted-foreground">Number of travellers</span>
            <span className="font-medium text-foreground">{travellers.length}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <span className="font-semibold text-foreground">Total price</span>
            <span className="text-lg font-bold text-brand-text">{money(totalNum)}</span>
          </div>
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
              <p className="mt-1 text-[11px] text-muted-foreground">Auto: {money(selected.price)} × {travellers.length}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="deposit" className="block text-sm font-medium text-foreground mb-1">Deposit paid now (USD)</label>
            <input id="deposit" type="number" min={0} step="0.01" value={deposit}
              onChange={e => setDeposit(e.target.value)} className={inputCls} placeholder="Optional" />
          </div>
          <div>
            <label htmlFor="depositMethod" className="block text-sm font-medium text-foreground mb-1">Method</label>
            <select id="depositMethod" value={depositMethod} onChange={e => setDepositMethod(e.target.value)} className={inputCls}>
              <option value="">—</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="mpesa">M-Pesa</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="depositReference" className="block text-sm font-medium text-foreground mb-1">Reference</label>
            <input id="depositReference" value={depositReference} onChange={e => setDepositReference(e.target.value)}
              className={inputCls} placeholder="Optional" />
          </div>
        </div>
        {depositNum > 0 && (
          <p className="text-xs text-muted-foreground">
            Recording {money(depositNum)} paid · {money(balance)} balance remaining.
          </p>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex gap-3">
        <Button type="submit" loading={pending} loadingText="Creating…" disabled={overCapacity}>Confirm booking</Button>
        <ButtonLink href="/admin/bookings">Cancel</ButtonLink>
      </div>
    </form>
  )
}

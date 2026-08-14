'use client'

import { useMemo, useState } from 'react'
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

export interface RequestOption {
  id: string
  reference: string
  clientName: string | null
  tourTitle: string | null
  stage: string
  groupSize: number | null
  startDate: string | null
}

export interface ClientOption {
  id: string
  name: string
  email: string | null
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

export default function NewBookingForm({
  departures,
  requests,
  clients,
  preselectId,
  preselectRequestId,
  preselectClientId,
}: {
  departures: DepartureOption[]
  requests: RequestOption[]
  clients: ClientOption[]
  preselectId: string | null
  preselectRequestId: string | null
  preselectClientId: string | null
}) {
  const [departureId, setDepartureId] = useState(preselectId ?? '')
  const [requestId, setRequestId] = useState(preselectRequestId ?? '')
  const [clientId, setClientId] = useState(preselectClientId ?? '')
  const [status, setStatus] = useState('confirmed')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [travellerCount, setTravellerCount] = useState(1)
  const [travellers, setTravellers] = useState<TravellerRow[]>([emptyTraveller()])
  const [priceEdited, setPriceEdited] = useState(false)
  const [price, setPrice] = useState('')
  const [deposit, setDeposit] = useState('')
  const [depositMethod, setDepositMethod] = useState('')
  const [depositReference, setDepositReference] = useState('')
  const [error, setError] = useState('')
  const { pending, run } = useAction()

  const selected = useMemo(() => departures.find(d => d.id === departureId) ?? null, [departures, departureId])
  const selectedRequest = useMemo(() => requests.find(r => r.id === requestId) ?? null, [requests, requestId])

  // Auto-suggest total = per-seat price × travellers, until the user edits it.
  // With no departure there is no per-seat price to work from, so the total is
  // simply typed in.
  const suggestedTotal = selected ? selected.price * travellerCount : 0
  const effectivePrice = priceEdited ? price : (selected ? String(suggestedTotal) : price)
  const totalNum = Number(effectivePrice) || 0
  const depositNum = Number(deposit) || 0
  const balance = Math.max(0, totalNum - depositNum)

  function updateTraveller(i: number, patch: Partial<TravellerRow>) {
    setTravellers(ts => ts.map((t, idx) => idx === i ? { ...t, ...patch } : t))
  }
  function setCount(n: number) {
    setTravellerCount(n)
    setTravellers(ts => {
      if (n === ts.length) return ts
      if (n < ts.length) return ts.slice(0, n)
      return [...ts, ...Array.from({ length: n - ts.length }, emptyTraveller)]
    })
  }
  function addTraveller() {
    setTravellers(ts => {
      const next = [...ts, emptyTraveller()]
      setTravellerCount(c => Math.max(c, next.length))
      return next
    })
  }
  function removeTraveller(i: number) {
    setTravellers(ts => ts.length > 1 ? ts.filter((_, idx) => idx !== i) : ts)
  }

  const overCapacity = selected != null && travellerCount > selected.seatsLeft
  const named = travellers.filter(t => t.firstName.trim() || t.lastName.trim() || t.email.trim())
  const hasAnchor = Boolean(departureId || requestId || clientId || named.length > 0)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (!hasAnchor) {
      setError('Choose a departure, a request or a client — or name at least one traveller.')
      return
    }
    if (overCapacity) { setError(`Only ${selected?.seatsLeft} seat(s) left on this departure.`); return }
    if (depositNum > totalNum) { setError('Deposit cannot exceed the total price.'); return }
    if (!selected && startDate && endDate && endDate < startDate) {
      setError('The end date is before the start date.')
      return
    }

    const fd = new FormData()
    fd.set('departureId', departureId)
    fd.set('requestId', requestId)
    fd.set('clientId', clientId)
    fd.set('status', status)
    // A departure owns its own dates, so these only travel without one.
    fd.set('startDate', selected ? '' : startDate)
    fd.set('endDate', selected ? '' : endDate)
    fd.set('travellerCount', String(travellerCount))
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* What the booking is attached to — all three optional */}
      <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Trip</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            All optional. Pick a departure for a scheduled group trip, or leave it blank and attach the
            booking to a request or a client instead.
          </p>
        </div>

        <div>
          <label htmlFor="departure" className="block text-sm font-medium text-foreground mb-1">Departure</label>
          <select id="departure" value={departureId} onChange={e => setDepartureId(e.target.value)} className={inputCls}>
            <option value="">No departure — private trip</option>
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

        {/* Only offered without a departure: a seat runs when its departure
            runs, and a second editable answer is how two travellers on the same
            trip end up printing different dates (lib/trip-dates.ts). */}
        {!selected && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-foreground mb-1">Start date</label>
              <input id="startDate" type="date" value={startDate}
                onChange={e => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-foreground mb-1">End date</label>
              <input id="endDate" type="date" value={endDate} min={startDate || undefined}
                onChange={e => setEndDate(e.target.value)} className={inputCls} />
            </div>
            <p className="col-span-2 -mt-1 text-xs text-muted-foreground">
              Optional — leave blank if the dates are not agreed yet. No seats are reserved either way.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="request" className="block text-sm font-medium text-foreground mb-1">Request</label>
          <select id="request" value={requestId} onChange={e => setRequestId(e.target.value)} className={inputCls}>
            <option value="">Not from a request</option>
            {requests.map(r => (
              <option key={r.id} value={r.id}>
                {r.reference}
                {r.clientName ? ` · ${r.clientName}` : ''}
                {r.tourTitle ? ` · ${r.tourTitle}` : ''}
                {r.startDate ? ` · ${fmtDate(r.startDate)}` : ''}
              </option>
            ))}
          </select>
          {selectedRequest && (
            <p className="mt-1 text-xs text-muted-foreground">
              Stage: {selectedRequest.stage}
              {selectedRequest.groupSize ? ` · asked for ${selectedRequest.groupSize} traveller(s)` : ''}
              {!clientId && selectedRequest.clientName
                ? ` · the booking will go to ${selectedRequest.clientName}`
                : ''}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="client" className="block text-sm font-medium text-foreground mb-1">Client</label>
          <select id="client" value={clientId} onChange={e => setClientId(e.target.value)} className={inputCls}>
            <option value="">
              {selectedRequest?.clientName
                ? `From the request — ${selectedRequest.clientName}`
                : 'From the lead traveller’s email'}
            </option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{c.email ? ` · ${c.email}` : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Choosing a client here wins over both. Left alone with no request and no traveller email, the
            booking is filed without a client and you can attach one later.
          </p>
        </div>

        {/* Number of travellers quick-select (mirrors the public Book Now page) */}
        <div>
          <span className="block text-sm font-medium text-foreground mb-2">Number of travellers</span>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {Array.from({ length: 8 }, (_, i) => i + 1).map(n => {
              const disabled = selected != null && n > selected.seatsLeft
              const active = travellerCount === n
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
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Traveller information <span className="font-normal text-muted-foreground">({travellers.length})</span>
          </h2>
          <button type="button" onClick={addTraveller} className="text-sm font-medium text-brand-text hover:underline">
            + Add traveller
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Optional — leave blank and the booking is still sized at {travellerCount} traveller
          {travellerCount !== 1 ? 's' : ''}. Names can be filled in later.
        </p>
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
                <input value={t.email} onChange={e => updateTraveller(i, { email: e.target.value })} placeholder="Email" type="email" className={inputCls} />
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
            That&rsquo;s {travellerCount} travellers but only {selected?.seatsLeft} seat(s) remain.
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
            <span className="font-medium text-foreground">{travellerCount}</span>
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
              <p className="mt-1 text-[11px] text-muted-foreground">Auto: {money(selected.price)} × {travellerCount}</p>
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

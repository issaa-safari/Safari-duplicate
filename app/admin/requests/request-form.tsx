'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createRequest, updateRequest } from './actions'
import { COUNTRIES_SORTED, dialCodeFor, countryByName } from '@/lib/countries'

export interface ClientOption {
  id: string
  name: string
  email: string | null
}

export interface TourOption {
  id: string
  title: string
  type: string | null
}

export interface DepartureOption {
  id: string
  title: string
  startDate: string
  endDate: string
}

export interface RequestFormInitial {
  source?: string
  clientQuestion?: string
  preferredDate?: string
  tripLengthNights?: string
  preferredRoomType?: string
  adults?: number
  childrenOlder?: number
  childrenYounger?: number
  priority?: boolean
}

const inputCls =
  'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

export default function RequestForm({
  clients,
  initialClientId,
  initial = {},
  requestId,
  tours = [],
  departures = [],
}: {
  clients: ClientOption[]
  initialClientId?: string | null
  initial?: RequestFormInitial
  requestId?: string
  tours?: TourOption[]
  departures?: DepartureOption[]
}) {
  const router = useRouter()
  const isEdit = !!requestId

  const preselected = initialClientId && clients.some(c => c.id === initialClientId)
    ? initialClientId
    : null
  const [clientMode, setClientMode] = useState<'existing' | 'new'>(
    preselected || clients.length > 0 ? 'existing' : 'new',
  )
  const [selectedClientId, setSelectedClientId] = useState<string | null>(preselected)
  const [query, setQuery] = useState('')

  const [priority, setPriority] = useState(initial.priority ?? false)
  const [createProposal, setCreateProposal] = useState(!isEdit)
  const [quoteMode, setQuoteMode] = useState<'custom' | 'fixed_departure'>('custom')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Kenya, first in COUNTRIES_SORTED, is a sensible default dial code for a
  // Kenya/Tanzania operator — synced to the Country field, overridable.
  const [phoneCountryCode, setPhoneCountryCode] = useState('KE')

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const found = countryByName(e.target.value)
    if (found) setPhoneCountryCode(found.code)
  }

  const selectedClient = clients.find(c => c.id === selectedClientId) ?? null
  const q = query.trim().toLowerCase()
  const matches = (q
    ? clients.filter(c =>
        c.name.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q))
    : clients
  ).slice(0, 8)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (clientMode === 'existing' && !selectedClientId) {
      setError('Choose a client, or switch to "New client" to enter their details.')
      return
    }

    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('priority', String(priority))
    formData.set('createQuote', String(createProposal && !isEdit))
    formData.set('quoteMode', quoteMode)
    if (clientMode === 'existing' && selectedClientId) {
      formData.set('clientId', selectedClientId)
    }
    if (clientMode === 'new') {
      const number = String(formData.get('phone') ?? '').trim()
      if (number) {
        const dial = dialCodeFor(phoneCountryCode)
        formData.set('phone', dial ? `+${dial}${number}` : number)
      }
    }
    const result = requestId
      ? await updateRequest(requestId, formData)
      : await createRequest(formData)
    if (result.error !== null) {
      setError(result.error)
      setLoading(false)
      return
    }
    router.push(result.redirectTo)
  }

  const backHref = isEdit ? `/admin/requests/${requestId}` : '/admin/requests'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-foreground">Client Information</h2>
          <div className="flex rounded-md border border-border overflow-hidden text-xs font-medium">
            <button type="button"
              onClick={() => setClientMode('existing')}
              className={clientMode === 'existing'
                ? 'px-3 py-1.5 bg-primary-strong text-white'
                : 'px-3 py-1.5 bg-surface text-muted-foreground hover:bg-muted'}>
              Existing client
            </button>
            <button type="button"
              onClick={() => setClientMode('new')}
              className={clientMode === 'new'
                ? 'px-3 py-1.5 bg-primary-strong text-white'
                : 'px-3 py-1.5 bg-surface text-muted-foreground hover:bg-muted'}>
              New client
            </button>
          </div>
        </div>

        {clientMode === 'existing' ? (
          <div className="space-y-3">
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-md border border-primary-strong bg-accent/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedClient.name}</p>
                  {selectedClient.email && (
                    <p className="text-xs text-muted-foreground">{selectedClient.email}</p>
                  )}
                </div>
                <button type="button"
                  onClick={() => { setSelectedClientId(null); setQuery('') }}
                  className="text-xs font-medium text-brand-text hover:underline">
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search clients by name or email..."
                  className={inputCls}
                />
                {clients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No clients yet — switch to &quot;New client&quot; to add one.
                  </p>
                ) : matches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clients match “{query}”.</p>
                ) : (
                  <div className="rounded-md border border-border divide-y divide-border/70 overflow-hidden">
                    {matches.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => setSelectedClientId(c.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-muted">
                        <span className="text-sm text-foreground">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input id="email" type="email" name="email" required placeholder="client@email.com" className={inputCls} />
            </div>
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1">First Name</label>
              <input id="firstName" type="text" name="firstName" required className={inputCls} />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1">Last Name</label>
              <input id="lastName" type="text" name="lastName" required className={inputCls} />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">Phone</label>
              <div className="flex gap-2">
                <select
                  value={phoneCountryCode}
                  onChange={e => setPhoneCountryCode(e.target.value)}
                  aria-label="Phone country code"
                  className="w-24 shrink-0 rounded-md border border-border px-2 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  {COUNTRIES_SORTED.map(c => (
                    <option key={c.code} value={c.code}>+{c.dial}</option>
                  ))}
                </select>
                <input id="phone" type="text" name="phone" className={`flex-1 min-w-0 ${inputCls}`} />
              </div>
            </div>
            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-foreground mb-1">WhatsApp</label>
              <input id="whatsapp" type="text" name="whatsapp" className={inputCls} />
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-foreground mb-1">Country</label>
              <select id="country" name="country" defaultValue="" onChange={handleCountryChange} className={inputCls}>
                <option value="">Select country...</option>
                {COUNTRIES_SORTED.map(c => (
                  <option key={c.code} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-foreground mb-1">Language</label>
              <select id="language" name="language" defaultValue="en" className={inputCls}>
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Request Details</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="clientQuestion" className="block text-sm font-medium text-foreground mb-1">Client Message</label>
            <textarea id="clientQuestion" name="clientQuestion" rows={3}
              defaultValue={initial.clientQuestion ?? ''}
              placeholder="Paste their WhatsApp message or email here..."
              className={inputCls} />
          </div>
          <div>
            <label htmlFor="source" className="block text-sm font-medium text-foreground mb-1">Source</label>
            <select id="source" name="source" defaultValue={initial.source ?? ''} className={inputCls}>
              <option value="">Select source...</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="website">Website</option>
              <option value="email">Email</option>
              <option value="instagram">Instagram</option>
              <option value="google">Google</option>
              <option value="facebook">Facebook</option>
              <option value="referral">Referral</option>
              <option value="direct">Direct</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="preferredDate" className="block text-sm font-medium text-foreground mb-1">Preferred Start Date</label>
              <input id="preferredDate" type="date" name="preferredDate" defaultValue={initial.preferredDate ?? ''} className={inputCls} />
            </div>
            <div>
              <label htmlFor="tripLengthNights" className="block text-sm font-medium text-foreground mb-1">Trip Length (nights)</label>
              <input id="tripLengthNights" type="number" name="tripLengthNights" min={1} placeholder="e.g. 7"
                defaultValue={initial.tripLengthNights ?? ''} className={inputCls} />
            </div>
          </div>
          <div>
            <label htmlFor="preferredRoomType" className="block text-sm font-medium text-foreground mb-1">Preferred Room Type</label>
            <select id="preferredRoomType" name="preferredRoomType" defaultValue={initial.preferredRoomType ?? ''} className={inputCls}>
              <option value="">Not specified</option>
              <option value="sharing">Sharing</option>
              <option value="single">Single</option>
              <option value="family">Family</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Travelers</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="adults" className="block text-xs text-muted-foreground mb-1">Adults</label>
                <input id="adults" type="number" name="adults" min={1} defaultValue={initial.adults ?? 2} className={inputCls} />
              </div>
              <div>
                <label htmlFor="childrenOlder" className="block text-xs text-muted-foreground mb-1">Children 12-18</label>
                <input id="childrenOlder" type="number" name="childrenOlder" min={0} defaultValue={initial.childrenOlder ?? 0} className={inputCls} />
              </div>
              <div>
                <label htmlFor="childrenYounger" className="block text-xs text-muted-foreground mb-1">Children 2-12</label>
                <input id="childrenYounger" type="number" name="childrenYounger" min={0} defaultValue={initial.childrenYounger ?? 0} className={inputCls} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="priority" checked={priority}
              onChange={e => setPriority(e.target.checked)}
              className="rounded border-border" />
            <label htmlFor="priority" className="text-sm text-foreground">
              Mark as priority
            </label>
          </div>
        </div>
      </div>

      {!isEdit && (
        <div className="rounded-xl border border-primary/30 bg-accent/20 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <input
              id="createProposal"
              type="checkbox"
              checked={createProposal}
              onChange={event => setCreateProposal(event.target.checked)}
              className="mt-1 rounded border-border"
            />
            <div className="flex-1">
              <label htmlFor="createProposal" className="text-sm font-semibold text-foreground">
                Create the proposal now
              </label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Creates the client, request, proposal version and traveller setup together, then opens the proposal workspace.
              </p>
            </div>
          </div>

          {createProposal && (
            <div className="mt-5 space-y-4 border-t border-primary/20 pt-5">
              <div>
                <span className="mb-2 block text-sm font-medium text-foreground">Proposal type</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setQuoteMode('custom')}
                    className={`rounded-lg border-2 p-3 text-left transition ${
                      quoteMode === 'custom' ? 'border-primary-strong bg-surface' : 'border-border bg-surface/60 hover:border-primary/40'
                    }`}
                  >
                    <span className="block text-sm font-medium text-foreground">Custom safari</span>
                    <span className="mt-1 block text-xs text-muted-foreground">Build and price a tailored itinerary</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuoteMode('fixed_departure')}
                    className={`rounded-lg border-2 p-3 text-left transition ${
                      quoteMode === 'fixed_departure' ? 'border-primary-strong bg-surface' : 'border-border bg-surface/60 hover:border-primary/40'
                    }`}
                  >
                    <span className="block text-sm font-medium text-foreground">Scheduled trip</span>
                    <span className="mt-1 block text-xs text-muted-foreground">Quote an existing departure</span>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="quoteTitle" className="mb-1 block text-sm font-medium text-foreground">Proposal title</label>
                <input
                  id="quoteTitle"
                  name="quoteTitle"
                  placeholder="e.g. Maasai Mara & Samburu — 8 days"
                  className={inputCls}
                />
              </div>

              {quoteMode === 'custom' ? (
                <div>
                  <label htmlFor="tourId" className="mb-1 block text-sm font-medium text-foreground">
                    Start from itinerary <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <select id="tourId" name="tourId" defaultValue="" className={inputCls}>
                    <option value="">Start with trip dates and blank days</option>
                    {tours.map(tour => (
                      <option key={tour.id} value={tour.id}>{tour.title}{tour.type ? ` · ${tour.type}` : ''}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="departureId" className="mb-1 block text-sm font-medium text-foreground">Departure</label>
                  <select id="departureId" name="departureId" required={quoteMode === 'fixed_departure'} defaultValue="" className={inputCls}>
                    <option value="" disabled>Choose a departure…</option>
                    {departures.map(departure => (
                      <option key={departure.id} value={departure.id}>
                        {departure.title} · {new Date(departure.startDate).toLocaleDateString('en-GB')} → {new Date(departure.endDate).toLocaleDateString('en-GB')}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">{error}</p>
      )}
      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60 bg-olive hover:bg-olive-dk">
          {loading
            ? 'Saving...'
            : isEdit
              ? 'Save Changes'
              : createProposal
                ? 'Create Request & Proposal'
                : 'Save Request'}
        </button>
        <Link href={backHref}
          className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
          Cancel
        </Link>
      </div>
    </form>
  )
}

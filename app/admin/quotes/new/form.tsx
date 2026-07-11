'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import CreateClientDialog from '@/components/admin/create-client-dialog'
import { createQuote } from './actions'

interface Client { id: string; first_name: string; last_name: string; email: string }
interface Request { id: string; reference: string; client_id: string }
interface Tour { id: string; title_en: string; type: string }
interface Departure { id: string; start_date: string; end_date: string; tours: { title_en: string }[] | null }

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

export default function NewQuoteForm({
  clients: clientsProp,
  requests,
  tours,
  departures,
  defaultClientId = '',
  defaultRequestId = '',
}: {
  clients: Client[]
  requests: Request[]
  tours: Tour[]
  departures: Departure[]
  defaultClientId?: string
  defaultRequestId?: string
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'custom' | 'fixed_departure' | ''>(
    defaultRequestId ? 'custom' : ''
  )
  // Held in state so a client added inline shows up (and is selected) at once.
  const [clients, setClients] = useState<Client[]>(clientsProp)
  const [addingClient, setAddingClient] = useState(false)
  const [clientId, setClientId] = useState(defaultClientId)
  const [requestId, setRequestId] = useState(defaultRequestId)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Linking a request is what carries dates, day skeleton and travellers into
  // the new quote — so when a client is picked, pre-select their most recent
  // request (requests arrive newest-first). The admin can still clear it.
  function handleClientChange(newClientId: string) {
    setClientId(newClientId)
    const current = requests.find(r => r.id === requestId)
    if (!current || current.client_id !== newClientId) {
      setRequestId(requests.find(r => r.client_id === newClientId)?.id ?? '')
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await createQuote(new FormData(e.currentTarget))
    if (result.error !== null) {
      setError(result.error)
      setLoading(false)
      return
    }
    router.push(result.redirectTo)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/quotes" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Quotes
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">New Quote</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Step 1 — Mode */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Quote Type</h2>
          <input type="hidden" name="mode" value={mode} />
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={'rounded-lg border-2 p-4 text-left transition ' +
                (mode === 'custom'
                  ? 'border-[var(--olive)] bg-[var(--olive)]/5'
                  : 'border-gray-200 hover:border-gray-300')}>
              <p className="font-medium text-gray-900 text-sm">Custom Safari</p>
              <p className="text-xs text-gray-500 mt-1">Build a bespoke itinerary and price from scratch</p>
            </button>
            <button
              type="button"
              onClick={() => setMode('fixed_departure')}
              className={'rounded-lg border-2 p-4 text-left transition ' +
                (mode === 'fixed_departure'
                  ? 'border-[var(--olive)] bg-[var(--olive)]/5'
                  : 'border-gray-200 hover:border-gray-300')}>
              <p className="font-medium text-gray-900 text-sm">Fixed Departure</p>
              <p className="text-xs text-gray-500 mt-1">Price a client into a scheduled group departure</p>
            </button>
          </div>
        </div>

        {/* Step 2 — Client & context (shown once mode chosen) */}
        {mode && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Client</h2>

            <div>
              <label htmlFor="clientId" className={labelCls}>Client <span className="text-red-500">*</span></label>
              <select id="clientId"
                name="clientId"
                required
                value={clientId}
                onChange={e => {
                  if (e.target.value === '__add__') { setAddingClient(true); return }
                  handleClientChange(e.target.value)
                }}
                className={inputCls}
              >
                <option value="" disabled>Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} — {c.email}
                  </option>
                ))}
                <option value="__add__">+ Add new client…</option>
              </select>
            </div>

            <div>
              <label htmlFor="requestId" className={labelCls}>Linked Request <span className="text-muted-foreground font-normal">(optional)</span></label>
              <select id="requestId"
                name="requestId"
                value={requestId}
                onChange={e => {
                  setRequestId(e.target.value)
                  const req = requests.find(r => r.id === e.target.value)
                  if (req?.client_id) setClientId(req.client_id)
                }}
                className={inputCls}
              >
                <option value="">No linked request</option>
                {requests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.reference}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="title" className={labelCls}>Quote Title <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input id="title"
                type="text"
                name="title"
                placeholder="e.g. Maasai Mara & Samburu 8 Days"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Fixed departure — pick departure */}
        {mode === 'fixed_departure' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Departure</h2>
            <div>
              <label htmlFor="departureId" className={labelCls}>Departure <span className="text-red-500">*</span></label>
              <select id="departureId" name="departureId" required defaultValue="" className={inputCls}>
                <option value="" disabled>Select a departure…</option>
                {departures.map((d) => (
                  <option key={d.id} value={d.id}>
                    {(Array.isArray(d.tours) ? (d.tours as any)[0]?.title_en : (d.tours as any)?.title_en) ?? 'Unknown tour'} —{' '}
                    {new Date(d.start_date).toLocaleDateString('en-GB')} →{' '}
                    {new Date(d.end_date).toLocaleDateString('en-GB')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Custom — optionally pin to a tour template */}
        {mode === 'custom' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Tour Template <span className="text-muted-foreground font-normal text-xs">(optional)</span></h2>
            <p className="text-xs text-muted-foreground -mt-2">Link to a tour to copy its itinerary as a starting point.</p>
            <div>
              <label htmlFor="tourId" className={labelCls}>Tour</label>
              <select id="tourId" name="tourId" defaultValue="" className={inputCls}>
                <option value="">No template</option>
                {tours.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title_en} ({t.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">{error}</p>
        )}

        {mode && (
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60 bg-olive hover:bg-olive-dk">
              {loading ? 'Creating…' : 'Create Quote'}
            </button>
            <Link
              href="/admin/quotes"
              className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </Link>
          </div>
        )}
      </form>

      {addingClient && (
        <CreateClientDialog
          onClose={() => setAddingClient(false)}
          onCreated={(c) => {
            setClients(prev => prev.some(p => p.id === c.id)
              ? prev
              : [...prev, { id: c.id, first_name: c.first_name, last_name: c.last_name, email: c.email ?? '' }]
                  .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)))
            handleClientChange(c.id)
          }}
        />
      )}
    </div>
  )
}

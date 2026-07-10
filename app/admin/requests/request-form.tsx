'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createRequest, updateRequest } from './actions'

export interface ClientOption {
  id: string
  name: string
  email: string | null
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
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

export default function RequestForm({
  clients,
  initialClientId,
  initial = {},
  requestId,
}: {
  clients: ClientOption[]
  initialClientId?: string | null
  initial?: RequestFormInitial
  requestId?: string
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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    if (clientMode === 'existing' && selectedClientId) {
      formData.set('clientId', selectedClientId)
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
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Client Information</h2>
          <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs font-medium">
            <button type="button"
              onClick={() => setClientMode('existing')}
              className={clientMode === 'existing'
                ? 'px-3 py-1.5 bg-[var(--olive)] text-white'
                : 'px-3 py-1.5 bg-white text-gray-600 hover:bg-gray-50'}>
              Existing client
            </button>
            <button type="button"
              onClick={() => setClientMode('new')}
              className={clientMode === 'new'
                ? 'px-3 py-1.5 bg-[var(--olive)] text-white'
                : 'px-3 py-1.5 bg-white text-gray-600 hover:bg-gray-50'}>
              New client
            </button>
          </div>
        </div>

        {clientMode === 'existing' ? (
          <div className="space-y-3">
            {selectedClient ? (
              <div className="flex items-center justify-between rounded-md border border-[var(--olive)] bg-[var(--olive)]/5 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedClient.name}</p>
                  {selectedClient.email && (
                    <p className="text-xs text-gray-500">{selectedClient.email}</p>
                  )}
                </div>
                <button type="button"
                  onClick={() => { setSelectedClientId(null); setQuery('') }}
                  className="text-xs font-medium text-[var(--olive)] hover:underline">
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
                  <p className="text-sm text-gray-400">
                    No clients yet — switch to &quot;New client&quot; to add one.
                  </p>
                ) : matches.length === 0 ? (
                  <p className="text-sm text-gray-400">No clients match “{query}”.</p>
                ) : (
                  <div className="rounded-md border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                    {matches.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => setSelectedClientId(c.id)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50">
                        <span className="text-sm text-gray-900">{c.name}</span>
                        <span className="text-xs text-gray-400">{c.email}</span>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" required placeholder="client@email.com" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" name="firstName" required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" name="lastName" required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" name="phone" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input type="text" name="whatsapp" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input type="text" name="country" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select name="language" defaultValue="en" className={inputCls}>
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Request Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Message</label>
            <textarea name="clientQuestion" rows={3}
              defaultValue={initial.clientQuestion ?? ''}
              placeholder="Paste their WhatsApp message or email here..."
              className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select name="source" defaultValue={initial.source ?? ''} className={inputCls}>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Start Date</label>
              <input type="date" name="preferredDate" defaultValue={initial.preferredDate ?? ''} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trip Length (nights)</label>
              <input type="number" name="tripLengthNights" min={1} placeholder="e.g. 7"
                defaultValue={initial.tripLengthNights ?? ''} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Room Type</label>
            <select name="preferredRoomType" defaultValue={initial.preferredRoomType ?? ''} className={inputCls}>
              <option value="">Not specified</option>
              <option value="sharing">Sharing</option>
              <option value="single">Single</option>
              <option value="family">Family</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Travelers</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Adults</label>
                <input type="number" name="adults" min={1} defaultValue={initial.adults ?? 2} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Children 12-18</label>
                <input type="number" name="childrenOlder" min={0} defaultValue={initial.childrenOlder ?? 0} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Children 2-12</label>
                <input type="number" name="childrenYounger" min={0} defaultValue={initial.childrenYounger ?? 0} className={inputCls} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="priority" checked={priority}
              onChange={e => setPriority(e.target.checked)}
              className="rounded border-gray-300" />
            <label htmlFor="priority" className="text-sm text-gray-700">
              Mark as priority
            </label>
          </div>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">{error}</p>
      )}
      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60 bg-olive hover:bg-olive-dk">
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Request'}
        </button>
        <Link href={backHref}
          className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </Link>
      </div>
    </form>
  )
}

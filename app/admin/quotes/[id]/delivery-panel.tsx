'use client'

import { useState, useTransition } from 'react'
import { createShareLink, revokeDelivery } from './delivery-actions'

interface Delivery {
  id: string
  quote_version_id: string
  channel: string
  access_token: string
  expires_at: string | null
  sent_at: string | null
  first_viewed_at: string | null
  last_viewed_at: string | null
  view_count: number
  revoked_at: string | null
  created_at: string
}

interface Version {
  id: string
  version_number: number
  status: string
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DeliveryPanel({
  quoteId,
  versions,
  deliveries: initial,
  baseUrl,
}: {
  quoteId: string
  versions: Version[]
  deliveries: Delivery[]
  baseUrl: string
}) {
  const [deliveries, setDeliveries] = useState(initial)
  const [selectedVersionId, setSelectedVersionId] = useState(
    versions.find(v => ['ready', 'sent', 'viewed'].includes(v.status))?.id ?? versions[0]?.id ?? ''
  )
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const shareableVersions = versions.filter(v => ['ready', 'sent', 'viewed', 'accepted'].includes(v.status))

  function handleCreate() {
    if (!selectedVersionId) return
    setError('')
    const fd = new FormData()
    fd.set('quoteId', quoteId)
    fd.set('versionId', selectedVersionId)
    startTransition(async () => {
      try {
        const result = await createShareLink(fd)
        const newDelivery: Delivery = {
          id: crypto.randomUUID(),
          quote_version_id: selectedVersionId,
          channel: 'share_link',
          access_token: result.token,
          expires_at: null,
          sent_at: new Date().toISOString(),
          first_viewed_at: null,
          last_viewed_at: null,
          view_count: 0,
          revoked_at: null,
          created_at: new Date().toISOString(),
        }
        setDeliveries(d => [newDelivery, ...d])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create link.')
      }
    })
  }

  function handleRevoke(deliveryId: string) {
    setError('')
    const fd = new FormData()
    fd.set('deliveryId', deliveryId)
    fd.set('quoteId', quoteId)
    startTransition(async () => {
      try {
        await revokeDelivery(fd)
        setDeliveries(ds => ds.map(d => d.id === deliveryId
          ? { ...d, revoked_at: new Date().toISOString() }
          : d
        ))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to revoke link.')
      }
    })
  }

  async function copyLink(token: string) {
    const url = `${baseUrl}/quote/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const versionLabel = (id: string) => {
    const v = versions.find(v => v.id === id)
    return v ? `v${v.version_number}` : id
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Share Links</h2>
        <p className="text-xs text-gray-400 mt-0.5">Generate a link to send to the client for viewing and acceptance.</p>
      </div>

      {shareableVersions.length > 0 && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-1">Version to share</label>
              <select
                value={selectedVersionId}
                onChange={e => setSelectedVersionId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]"
              >
                {shareableVersions.map(v => (
                  <option key={v.id} value={v.id}>
                    v{v.version_number} — {v.status}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={pending || !selectedVersionId}
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 shrink-0"
              style={{ backgroundColor: '#7A9A4A' }}
            >
              {pending ? 'Creating…' : 'Generate Link'}
            </button>
          </div>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      )}

      {deliveries.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">
          No share links yet. Mark a version as Ready and generate a link above.
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {deliveries.map(d => {
            const isRevoked = !!d.revoked_at
            const link = `${baseUrl}/quote/${d.access_token}`
            return (
              <div key={d.id} className={`px-5 py-4 ${isRevoked ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs font-medium text-gray-600">{versionLabel(d.quote_version_id)}</span>
                      {isRevoked ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500">Revoked</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">Active</span>
                      )}
                      {d.view_count > 0 && (
                        <span className="text-xs text-gray-400">
                          {d.view_count} view{d.view_count !== 1 ? 's' : ''}
                          {d.first_viewed_at && ` · first ${fmtDate(d.first_viewed_at)}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-gray-500 truncate flex-1 min-w-0 bg-gray-50 px-2 py-1 rounded">
                        {link}
                      </code>
                      {!isRevoked && (
                        <button
                          type="button"
                          onClick={() => copyLink(d.access_token)}
                          className="shrink-0 text-xs px-2.5 py-1 rounded border border-gray-200 hover:border-[#7A9A4A] text-gray-600 hover:text-[#4C5E2A] transition"
                        >
                          {copiedToken === d.access_token ? 'Copied!' : 'Copy'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Created {fmtDate(d.created_at)}</p>
                  </div>
                  {!isRevoked && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(d.id)}
                      disabled={pending}
                      className="shrink-0 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-100 hover:border-red-300 disabled:opacity-40"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

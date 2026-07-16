'use client'

import { useState, useTransition } from 'react'
import { createShareLink, revokeDelivery, emailQuote } from './delivery-actions'

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

// Mirrors the server's 90-day delivery expiry so the optimistic row shown
// before the next reload isn't misdated.
function ninetyDaysOut() {
  const d = new Date()
  d.setDate(d.getDate() + 90)
  return d.toISOString()
}

export default function DeliveryPanel({
  quoteId,
  versions,
  deliveries: initial,
  baseUrl,
  clientEmail,
}: {
  quoteId: string
  versions: Version[]
  deliveries: Delivery[]
  baseUrl: string
  clientEmail?: string | null
}) {
  const [deliveries, setDeliveries] = useState(initial)
  const [selectedVersionId, setSelectedVersionId] = useState(
    versions.find(v => ['ready', 'sent', 'viewed'].includes(v.status))?.id ?? versions[0]?.id ?? ''
  )
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, startTransition] = useTransition()

  // Must match the statuses the server actions accept (see delivery-actions.ts);
  // offering 'accepted' here only produced a guaranteed throw on send.
  const shareableVersions = versions.filter(v => ['ready', 'sent', 'viewed'].includes(v.status))

  function handleCreate() {
    if (!selectedVersionId) return
    setError('')
    const fd = new FormData()
    fd.set('quoteId', quoteId)
    fd.set('versionId', selectedVersionId)
    startTransition(async () => {
      const result = await createShareLink(fd)
      if (result.error !== null) {
        setError(result.error)
        return
      }
      const newDelivery: Delivery = {
        id: result.id,
        quote_version_id: selectedVersionId,
        channel: 'share_link',
        access_token: result.token,
        expires_at: ninetyDaysOut(),
        sent_at: new Date().toISOString(),
        first_viewed_at: null,
        last_viewed_at: null,
        view_count: 0,
        revoked_at: null,
        created_at: new Date().toISOString(),
      }
      setDeliveries(d => [newDelivery, ...d])
    })
  }

  function handleEmail() {
    if (!selectedVersionId) return
    setError('')
    setNotice('')
    const fd = new FormData()
    fd.set('quoteId', quoteId)
    fd.set('versionId', selectedVersionId)
    startTransition(async () => {
      const result = await emailQuote(fd)
      if (result.error !== null) {
        setError(result.error)
        return
      }
      const newDelivery: Delivery = {
        id: result.id,
        quote_version_id: selectedVersionId,
        channel: 'email',
        access_token: result.token,
        expires_at: ninetyDaysOut(),
        sent_at: new Date().toISOString(),
        first_viewed_at: null,
        last_viewed_at: null,
        view_count: 0,
        revoked_at: null,
        created_at: new Date().toISOString(),
      }
      setDeliveries(d => [newDelivery, ...d])
      setNotice(
        result.emailed
          ? `Emailed to ${result.recipient}.`
          : `Link created for ${result.recipient}, but email isn't configured on this environment — copy the link below to send it manually.`
      )
    })
  }

  function handleRevoke(deliveryId: string) {
    setError('')
    const fd = new FormData()
    fd.set('deliveryId', deliveryId)
    fd.set('quoteId', quoteId)
    startTransition(async () => {
      const result = await revokeDelivery(fd)
      if (result.error !== null) {
        setError(result.error)
        return
      }
      setDeliveries(ds => ds.map(d => d.id === deliveryId
        ? { ...d, revoked_at: new Date().toISOString() }
        : d
      ))
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
    <div id="delivery" className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden scroll-mt-6">
      <div className="px-5 py-4 border-b border-border/70">
        <h2 className="text-sm font-semibold text-foreground">Preview &amp; Send</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Generate a link to preview exactly what the client will see, then send it for viewing and acceptance.</p>
      </div>

      {shareableVersions.length > 0 && (
        <div className="px-5 py-4 border-b border-border/70 bg-surface-alt/50">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[160px]">
              <label htmlFor="version-to-share" className="block text-xs text-muted-foreground mb-1">Version to share</label>
              <select id="version-to-share"
                value={selectedVersionId}
                onChange={e => setSelectedVersionId(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
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
              className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 shrink-0 bg-olive hover:bg-olive-dk"
            >
              {pending ? 'Creating…' : 'Generate Link'}
            </button>
            <button
              type="button"
              onClick={handleEmail}
              disabled={pending || !selectedVersionId || !clientEmail}
              title={clientEmail ? `Email the proposal to ${clientEmail}` : 'Add a client email to enable sending'}
              className="rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 shrink-0 border border-border hover:border-primary-strong text-foreground"
            >
              {pending ? 'Sending…' : 'Email to client'}
            </button>
          </div>
          {clientEmail && <p className="text-xs text-muted-foreground mt-2">Emails the proposal link to {clientEmail}.</p>}
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          {notice && <p className="text-xs text-primary-strong mt-2">{notice}</p>}
        </div>
      )}

      {deliveries.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          No share links yet. Save pricing, then generate a link above.
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
                      <span className="text-xs font-medium text-muted-foreground">{versionLabel(d.quote_version_id)}</span>
                      {isRevoked ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">Revoked</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">Active</span>
                      )}
                      {d.view_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {d.view_count} view{d.view_count !== 1 ? 's' : ''}
                          {d.first_viewed_at && ` · first ${fmtDate(d.first_viewed_at)}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-muted-foreground truncate flex-1 min-w-0 bg-surface-alt px-2 py-1 rounded">
                        {link}
                      </code>
                      {!isRevoked && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-xs px-2.5 py-1 rounded border border-border hover:border-primary-strong text-muted-foreground hover:text-brand-ink transition"
                        >
                          Preview
                        </a>
                      )}
                      {!isRevoked && (
                        <button
                          type="button"
                          onClick={() => copyLink(d.access_token)}
                          className="shrink-0 text-xs px-2.5 py-1 rounded border border-border hover:border-primary-strong text-muted-foreground hover:text-brand-ink transition"
                        >
                          {copiedToken === d.access_token ? 'Copied!' : 'Copy'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Created {fmtDate(d.created_at)}</p>
                  </div>
                  {!isRevoked && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(d.id)}
                      disabled={pending}
                      className="shrink-0 text-xs text-destructive hover:opacity-80 px-2 py-1 rounded border border-red-100 hover:border-red-300 disabled:opacity-40"
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

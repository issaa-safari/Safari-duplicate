'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Dialog from '@/components/ui/dialog'
import CreateClientDialog from '@/components/admin/create-client-dialog'
import { createQuoteForClient } from './actions'

export interface TemplateClient {
  id: string
  first_name: string
  last_name: string
  email: string | null
}

const inputCls =
  'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

// Instantiate a template for a client: pick an existing client (or add one
// inline), then deep-copy the template into a fresh, client-bound quote and
// jump into it to adjust pricing for their request.
export default function ShareTemplateDialog({
  templateId,
  templateTitle,
  clients: clientsProp,
  onClose,
}: {
  templateId: string
  templateTitle: string
  clients: TemplateClient[]
  onClose: () => void
}) {
  const router = useRouter()
  const [clients, setClients] = useState<TemplateClient[]>(clientsProp)
  const [clientId, setClientId] = useState('')
  const [addingClient, setAddingClient] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!clientId) { setError('Please choose a client.'); return }
    setError('')
    setLoading(true)
    const fd = new FormData()
    fd.set('templateId', templateId)
    fd.set('clientId', clientId)
    const result = await createQuoteForClient(fd)
    if (result.error !== null) {
      setError(result.error)
      setLoading(false)
      return
    }
    // On success we navigate to the new quote — keep the button busy through
    // the transition rather than flipping it back first.
    router.push(result.redirectTo)
  }

  const clientLabel = (c: TemplateClient) =>
    `${c.first_name} ${c.last_name}`.trim() + (c.email ? ` — ${c.email}` : '')

  return (
    <>
      <Dialog
        title="Use template for a client"
        onClose={onClose}
        footer={
          <>
            <button type="button" onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface">
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={loading || !clientId}
              className="rounded-md bg-olive px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-olive-dk">
              {loading ? 'Creating…' : 'Create & edit pricing'}
            </button>
          </>
        }
      >
        <div className="space-y-4 p-5">
          <p className="text-sm text-muted-foreground">
            Copies <span className="font-medium text-foreground">{templateTitle || 'this template'}</span> —
            itinerary and pricing — into a new quote for the client. You can then adjust the pricing for
            their request and share it from the quote&apos;s Preview &amp; Send panel.
          </p>

          <div>
            <label htmlFor="share-client" className="block text-sm font-medium text-foreground mb-1">
              Client <span className="text-destructive">*</span>
            </label>
            <select
              id="share-client"
              value={clientId}
              onChange={e => {
                if (e.target.value === '__add__') { setAddingClient(true); return }
                setClientId(e.target.value)
                setError('')
              }}
              className={inputCls}
            >
              <option value="" disabled>Select a client…</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{clientLabel(c)}</option>
              ))}
              <option value="__add__">+ Add new client…</option>
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </Dialog>

      {addingClient && (
        <CreateClientDialog
          onClose={() => setAddingClient(false)}
          onCreated={(c) => {
            setClients(prev => prev.some(p => p.id === c.id)
              ? prev
              : [...prev, { id: c.id, first_name: c.first_name, last_name: c.last_name, email: c.email }]
                  .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)))
            setClientId(c.id)
            setError('')
          }}
        />
      )}
    </>
  )
}

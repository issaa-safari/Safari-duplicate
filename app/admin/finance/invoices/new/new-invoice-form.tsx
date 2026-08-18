'use client'

import { useState } from 'react'
import { useAction } from '@/lib/hooks/use-action'
import { Alert } from '@/components/ui/alert'
import { Button, ButtonLink } from '@/components/ui/button'
import { createInvoiceFreehand } from '../actions'

export interface ClientOption {
  id: string
  name: string
  email: string | null
}

type Mode = 'existing' | 'new' | 'plain'

const inputCls =
  'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

export default function NewInvoiceForm({ clients }: { clients: ClientOption[] }) {
  const { pending, run } = useAction()
  const [error, setError] = useState('')
  const [mode, setMode] = useState<Mode>(clients.length > 0 ? 'existing' : 'new')
  const [existingClientId, setExistingClientId] = useState(clients[0]?.id ?? '')

  const selected = clients.find((c) => c.id === existingClientId)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    if (mode === 'existing') {
      fd.set('existingClientId', existingClientId)
      fd.set('clientName', selected?.name ?? '')
      fd.set('clientEmail', selected?.email ?? '')
    } else {
      fd.set('existingClientId', '')
    }
    run(async () => {
      try {
        await createInvoiceFreehand(fd)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong.'
        if (!message.includes('NEXT_REDIRECT')) setError(message)
      }
    })
  }

  const modeTab = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        mode === m ? 'bg-olive text-white' : 'border border-border text-muted-foreground hover:bg-muted'
      }`}
    >
      {label}
    </button>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Who is this for?</label>
          <div className="flex flex-wrap gap-2">
            {clients.length > 0 && modeTab('existing', 'Existing client')}
            {modeTab('new', 'New client')}
            {modeTab('plain', 'Just a name — no record')}
          </div>
        </div>

        {mode === 'existing' && (
          <div>
            <label htmlFor="existingClientSelect" className="block text-sm font-medium text-foreground mb-1">Client</label>
            <select
              id="existingClientSelect"
              value={existingClientId}
              onChange={(e) => setExistingClientId(e.target.value)}
              className={inputCls}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.email ? ` — ${c.email}` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {mode === 'new' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-foreground mb-1">Name</label>
              <input id="clientName" name="clientName" required className={inputCls} />
            </div>
            <div>
              <label htmlFor="clientEmail" className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input id="clientEmail" name="clientEmail" type="email" required className={inputCls} />
            </div>
          </div>
        )}

        {mode === 'plain' && (
          <div>
            <label htmlFor="clientNamePlain" className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input id="clientNamePlain" name="clientName" required className={inputCls}
              placeholder="Won&rsquo;t create a client record" />
            <p className="mt-1 text-xs text-muted-foreground">
              Nothing is saved to the client list — just this document&rsquo;s own address.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="clientAddress" className="block text-sm font-medium text-foreground mb-1">
            Address <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea id="clientAddress" name="clientAddress" rows={2} className={inputCls} />
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex gap-3">
        <Button type="submit" loading={pending} loadingText="Creating…">Create draft invoice</Button>
        <ButtonLink href="/admin/finance/invoices">Cancel</ButtonLink>
      </div>
    </form>
  )
}

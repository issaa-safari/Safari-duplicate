'use client'

import { useState } from 'react'
import { useAction } from '@/lib/hooks/use-action'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { createMotorbike, updateMotorbike, archiveMotorbike, restoreMotorbike } from './actions'
import type { Motorbike } from '@/lib/types'

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  maintenance: 'bg-amber-100 text-amber-700',
  retired: 'bg-muted text-muted-foreground',
}

function BikeFields({ bike }: { bike?: Motorbike }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="col-span-2 sm:col-span-1">
        <label className="block text-xs font-medium text-muted-foreground mb-1">Name / label *</label>
        <input name="name" required defaultValue={bike?.name ?? ''} placeholder="Bike 01" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Make</label>
        <input name="make" defaultValue={bike?.make ?? ''} placeholder="Honda" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Model</label>
        <input name="model" defaultValue={bike?.model ?? ''} placeholder="CRF300L" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Plate</label>
        <input name="plateNumber" defaultValue={bike?.plate_number ?? ''} placeholder="KDA 123A" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Engine (cc)</label>
        <input name="engineCc" type="number" min={1} defaultValue={bike?.engine_cc ?? ''} placeholder="300" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Color</label>
        <input name="color" defaultValue={bike?.color ?? ''} placeholder="Red" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
        <select name="status" defaultValue={bike?.status ?? 'available'} className={inputCls}>
          <option value="available">Available</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>
      </div>
      <div className="col-span-2 sm:col-span-3">
        <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
        <input name="notes" defaultValue={bike?.notes ?? ''} placeholder="Service history, quirks…" className={inputCls} />
      </div>
    </div>
  )
}

function EditRow({ bike, onDone }: { bike: Motorbike; onDone: () => void }) {
  const [error, setError] = useState('')
  const { pending, run } = useAction()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    run(async () => {
      try {
        await updateMotorbike(bike.id, fd)
        onDone()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
      <BikeFields bike={bike} />
      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={pending} loadingText="Saving…">Save</Button>
        <button type="button" onClick={onDone}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground border border-border hover:bg-muted">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function FleetClient({ bikes }: { bikes: Motorbike[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [addError, setAddError] = useState('')
  const { pending, run } = useAction()

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAddError('')
    const form = e.currentTarget
    const fd = new FormData(form)
    run(async () => {
      try {
        await createMotorbike(fd)
        form.reset()
        setShowAdd(false)
      } catch (err) {
        setAddError(err instanceof Error ? err.message : 'Failed to add bike.')
      }
    })
  }

  const active = bikes.filter(b => b.is_active)
  const retired = bikes.filter(b => !b.is_active)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
        {!showAdd ? (
          <button onClick={() => { setShowAdd(true); setAddError('') }}
            className="text-sm font-medium text-brand-text hover:underline">
            + Add motorbike
          </button>
        ) : (
          <form onSubmit={handleAdd} className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Add motorbike</h2>
            <BikeFields />
            {addError && <Alert variant="error">{addError}</Alert>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={pending} loadingText="Adding…">Add bike</Button>
              <button type="button" onClick={() => { setShowAdd(false); setAddError('') }}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground border border-border hover:bg-muted">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {active.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No motorbikes in the fleet yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {active.map(b => (
              <li key={b.id} className="p-4">
                {editing === b.id ? (
                  <EditRow bike={b} onDone={() => setEditing(null)} />
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {b.name}
                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase ${STATUS_STYLES[b.status] ?? STATUS_STYLES.available}`}>
                          {b.status}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[b.make, b.model].filter(Boolean).join(' ') || '—'}
                        {b.engine_cc ? ` · ${b.engine_cc}cc` : ''}
                        {b.color ? ` · ${b.color}` : ''}
                        {b.plate_number ? ` · ${b.plate_number}` : ''}
                      </p>
                      {b.notes && <p className="text-xs text-muted-foreground mt-1">{b.notes}</p>}
                    </div>
                    <div className="flex shrink-0 gap-3 text-xs">
                      <button onClick={() => setEditing(b.id)} className="text-brand-text hover:underline">Edit</button>
                      <button onClick={() => run(() => archiveMotorbike(b.id))} disabled={pending}
                        className="text-muted-foreground hover:text-destructive">Retire</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {retired.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Retired</h3>
          <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {retired.map(b => (
              <li key={b.id} className="flex items-center justify-between p-4 text-sm">
                <span className="text-muted-foreground">
                  {b.name} · {[b.make, b.model].filter(Boolean).join(' ') || '—'}
                </span>
                <button onClick={() => run(() => restoreMotorbike(b.id))} disabled={pending}
                  className="text-xs text-brand-text hover:underline">Restore</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

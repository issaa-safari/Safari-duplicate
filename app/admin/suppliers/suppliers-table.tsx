'use client'

import { useState } from 'react'
import { useAction } from '@/lib/hooks/use-action'
import Link from 'next/link'
import { createSupplier, setSupplierActive, updateSupplier } from './actions'
import { SUPPLIER_TYPES, type SupplierRow } from './constants'

const inputCls =
  'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

function typeLabel(t: string) {
  return t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function SupplierFields({ supplier }: { supplier?: SupplierRow }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <div className="md:col-span-2">
        <input name="name" required defaultValue={supplier?.name ?? ''} placeholder="Supplier name *" className={inputCls} />
      </div>
      <select name="supplierType" defaultValue={supplier?.supplier_type ?? 'other'} className={inputCls}>
        {SUPPLIER_TYPES.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
      </select>
      <input name="contactEmail" type="email" defaultValue={supplier?.contact_email ?? ''} placeholder="Email" className={inputCls} />
      <input name="contactPhone" defaultValue={supplier?.contact_phone ?? ''} placeholder="Phone" className={inputCls} />
      <div className="md:col-span-5">
        <input name="notes" defaultValue={supplier?.notes ?? ''} placeholder="Notes" className={inputCls} />
      </div>
    </div>
  )
}

export default function SuppliersTable({
  suppliers,
  rateCardCounts = {},
}: {
  suppliers: SupplierRow[]
  rateCardCounts?: Record<string, number>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const { pending, run: runAction } = useAction()

  function run(action: (fd: FormData) => Promise<void>, fd: FormData, success: string) {
    setError(''); setMessage('')
    runAction(async () => {
      try {
        await action(fd)
        setMessage(success)
        setEditingId(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  function submitNew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    run(createSupplier, fd, 'Supplier added.')
    form.reset()
  }

  function submitEdit(e: React.FormEvent<HTMLFormElement>, supplierId: string) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('supplierId', supplierId)
    run(updateSupplier, fd, 'Supplier updated.')
  }

  function toggleActive(supplier: SupplierRow) {
    const fd = new FormData()
    fd.set('supplierId', supplier.id)
    fd.set('isActive', String(!supplier.is_active))
    run(setSupplierActive, fd, supplier.is_active ? 'Supplier deactivated.' : 'Supplier reactivated.')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {suppliers.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No suppliers yet — add the first one below. Rate cards link to suppliers so Payables knows who is owed.
          </p>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border/70">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Contact</th>
                <th className="px-3 py-3 font-medium">Rates</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                editingId === s.id ? (
                  <tr key={s.id} className="border-b border-gray-50 bg-accent/50">
                    <td colSpan={6} className="px-5 py-4">
                      <form onSubmit={e => submitEdit(e, s.id)} className="space-y-3">
                        <SupplierFields supplier={s} />
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={() => setEditingId(null)}
                            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border hover:bg-muted">
                            Cancel
                          </button>
                          <button type="submit" disabled={pending}
                            className="rounded-md px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50 bg-olive hover:bg-olive-dk">
                            {pending ? 'Saving…' : 'Save supplier'}
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0">
                    <td data-label="Name" className="px-5 py-3 font-medium text-foreground">
                      {s.name}
                      {s.notes && <p className="text-xs text-muted-foreground font-normal mt-0.5">{s.notes}</p>}
                    </td>
                    <td data-label="Type" className="px-3 py-3 text-muted-foreground">{typeLabel(s.supplier_type)}</td>
                    <td data-label="Contact" className="px-3 py-3 text-muted-foreground text-xs">
                      {s.contact_email && <p>{s.contact_email}</p>}
                      {s.contact_phone && <p>{s.contact_phone}</p>}
                      {!s.contact_email && !s.contact_phone && '—'}
                    </td>
                    <td data-label="Rates" className="px-3 py-3 text-xs">
                      {(rateCardCounts[s.id] ?? 0) > 0 ? (
                        <Link href={`/admin/content/rates?supplierId=${s.id}`}
                          className="text-brand-text hover:text-brand-ink font-medium">
                          {rateCardCounts[s.id]} rate card{rateCardCounts[s.id] === 1 ? '' : 's'}
                        </Link>
                      ) : (
                        <Link href={`/admin/content/rates/new?supplierId=${s.id}`}
                          className="text-muted-foreground hover:text-foreground">
                          Add rates
                        </Link>
                      )}
                    </td>
                    <td data-label="Status" className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button type="button" onClick={() => setEditingId(s.id)}
                        className="text-xs text-brand-text hover:text-brand-ink mr-3">Edit</button>
                      <button type="button" onClick={() => toggleActive(s)} disabled={pending}
                        className="text-xs text-muted-foreground hover:text-foreground">
                        {s.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form onSubmit={submitNew} className="bg-accent/50 rounded-lg border border-primary-strong/30 p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">Add supplier</p>
        <SupplierFields />
        <div className="flex justify-end">
          <button type="submit" disabled={pending}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 bg-olive hover:bg-olive-dk">
            {pending ? 'Adding…' : '+ Add supplier'}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>}
      {message && <p className="text-sm text-green-700 bg-green-50 rounded px-3 py-2">{message}</p>}
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createSupplier, setSupplierActive, updateSupplier } from './actions'
import { SUPPLIER_TYPES, type SupplierRow } from './constants'

const inputCls =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

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
  const [pending, startTransition] = useTransition()

  function run(action: (fd: FormData) => Promise<void>, fd: FormData, success: string) {
    setError(''); setMessage('')
    startTransition(async () => {
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
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        {suppliers.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-400">
            No suppliers yet — add the first one below. Rate cards link to suppliers so Payables knows who is owed.
          </p>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
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
                  <tr key={s.id} className="border-b border-gray-50 bg-[var(--olive)]/5">
                    <td colSpan={6} className="px-5 py-4">
                      <form onSubmit={e => submitEdit(e, s.id)} className="space-y-3">
                        <SupplierFields supplier={s} />
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={() => setEditingId(null)}
                            className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50">
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
                    <td data-label="Name" className="px-5 py-3 font-medium text-gray-800">
                      {s.name}
                      {s.notes && <p className="text-xs text-gray-400 font-normal mt-0.5">{s.notes}</p>}
                    </td>
                    <td data-label="Type" className="px-3 py-3 text-gray-600">{typeLabel(s.supplier_type)}</td>
                    <td data-label="Contact" className="px-3 py-3 text-gray-500 text-xs">
                      {s.contact_email && <p>{s.contact_email}</p>}
                      {s.contact_phone && <p>{s.contact_phone}</p>}
                      {!s.contact_email && !s.contact_phone && '—'}
                    </td>
                    <td data-label="Rates" className="px-3 py-3 text-xs">
                      {(rateCardCounts[s.id] ?? 0) > 0 ? (
                        <Link href={`/admin/content/rates?supplierId=${s.id}`}
                          className="text-[var(--olive)] hover:text-[var(--olive-dk)] font-medium">
                          {rateCardCounts[s.id]} rate card{rateCardCounts[s.id] === 1 ? '' : 's'}
                        </Link>
                      ) : (
                        <Link href={`/admin/content/rates/new?supplierId=${s.id}`}
                          className="text-gray-400 hover:text-gray-600">
                          Add rates
                        </Link>
                      )}
                    </td>
                    <td data-label="Status" className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button type="button" onClick={() => setEditingId(s.id)}
                        className="text-xs text-[var(--olive)] hover:text-[var(--olive-dk)] mr-3">Edit</button>
                      <button type="button" onClick={() => toggleActive(s)} disabled={pending}
                        className="text-xs text-gray-400 hover:text-gray-600">
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

      <form onSubmit={submitNew} className="bg-[var(--olive)]/5 rounded-lg border border-[var(--olive)]/30 p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Add supplier</p>
        <SupplierFields />
        <div className="flex justify-end">
          <button type="submit" disabled={pending}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 bg-olive hover:bg-olive-dk">
            {pending ? 'Adding…' : '+ Add supplier'}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}
      {message && <p className="text-sm text-green-700 bg-green-50 rounded px-3 py-2">{message}</p>}
    </div>
  )
}

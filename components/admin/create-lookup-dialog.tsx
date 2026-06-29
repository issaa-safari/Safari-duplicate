'use client'

import { useState } from 'react'

const G = '#7A9A4A'

// Small dialog to create a new Content-library item with bilingual description.
// The caller's onSubmit performs the actual createLookup + state update.
export default function CreateLookupDialog({
  title,
  onSubmit,
  onClose,
}: {
  title: string
  onSubmit: (name: string, descriptionEn: string, descriptionAr: string) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [en, setEn] = useState('')
  const [ar, setAr] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!name.trim()) { setError('Name is required.'); return }
    setBusy(true); setError('')
    try {
      await onSubmit(name.trim(), en.trim(), ar.trim())
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create')
      setBusy(false)
    }
  }

  const inp = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]'

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: 'rgba(26,46,19,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (English)</label>
            <textarea value={en} onChange={e => setEn(e.target.value)} rows={3} className={inp + ' resize-none'} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (Arabic)</label>
            <textarea value={ar} onChange={e => setAr(e.target.value)} rows={3} dir="rtl" className={inp + ' resize-none text-right'} />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-white">Cancel</button>
          <button onClick={submit} disabled={busy}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: G }}>
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

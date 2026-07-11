'use client'

import { useState } from 'react'
import Dialog from '@/components/ui/dialog'
import { Field, TextareaField } from '@/components/ui/input'

const LBL = 'block text-xs font-medium text-muted-foreground mb-1'

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

  return (
    <Dialog
      title={title}
      onClose={onClose}
      // Nested above ActivitiesModal (z-50), so it needs a higher z
      overlayClass="z-[60] pt-20"
      footer={
        <>
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface">Cancel</button>
          <button onClick={submit} disabled={busy}
            className="rounded-md bg-olive px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {busy ? 'Creating…' : 'Create'}
          </button>
        </>
      }
    >
      <div className="p-5 space-y-3">
        <Field label="Name *" labelClass={LBL} autoFocus value={name}
          onChange={e => setName(e.target.value)} />
        <TextareaField label="Description (English)" labelClass={LBL} value={en} rows={3}
          onChange={e => setEn(e.target.value)} className="resize-none" />
        <TextareaField label="Description (Arabic)" labelClass={LBL} value={ar} rows={3} dir="rtl"
          onChange={e => setAr(e.target.value)} className="resize-none text-right" />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </Dialog>
  )
}

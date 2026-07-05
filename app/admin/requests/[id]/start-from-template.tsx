'use client'

import { useState, useTransition } from 'react'
import { startFromTemplate } from '@/app/admin/tour-templates/actions'

interface TemplateOption {
  id: string
  label: string
}

export default function StartFromTemplate({ requestId, templates }: { requestId: string; templates: TemplateOption[] }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  if (templates.length === 0) return null

  function go(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setError('')
    const fd = new FormData()
    fd.set('templateId', selected)
    fd.set('requestId', requestId)
    // startFromTemplate redirects on success, so the transition never resolves.
    startTransition(async () => {
      try {
        await startFromTemplate(fd)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to copy template.')
      }
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="rounded-md border border-[var(--olive)]/40 px-4 py-2 text-sm font-medium text-[var(--olive-dk)] hover:bg-[var(--olive)]/5">
        Start from template
      </button>
    )
  }

  return (
    <form onSubmit={go} className="flex flex-col sm:flex-row items-start gap-2 bg-white rounded-lg border border-gray-200 p-3">
      <select value={selected} onChange={e => setSelected(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)] min-w-[220px]">
        <option value="">Choose a template…</option>
        {templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <div className="flex gap-2">
        <button type="submit" disabled={pending || !selected}
          className="rounded-md px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 bg-olive hover:bg-olive-dk">
          {pending ? 'Copying…' : 'Copy into new quote'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600 w-full">{error}</p>}
    </form>
  )
}

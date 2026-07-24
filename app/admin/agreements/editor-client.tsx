'use client'

import { useState } from 'react'
import { useAction } from '@/lib/hooks/use-action'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { saveAgreementTemplate } from './actions'
import type { AgreementTemplate } from '@/lib/types'

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

export default function AgreementEditor({ template }: { template: AgreementTemplate | null }) {
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const { pending, run } = useAction()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setSaved(false)
    const fd = new FormData(e.currentTarget)
    run(async () => {
      try {
        await saveAgreementTemplate(fd)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {template && <input type="hidden" name="id" value={template.id} />}
      <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input name="title" required defaultValue={template?.title ?? ''} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Version label</label>
            <input name="versionLabel" defaultValue={template?.version_label ?? ''} placeholder="v1" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Language</label>
          <select name="language" defaultValue={template?.language ?? 'en'} className={inputCls}>
            <option value="en">English</option>
            <option value="ar">العربية (Arabic)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Agreement &amp; policies
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            This is the full document each traveller reads and signs. Blank lines separate paragraphs.
            The text is snapshotted when you issue an agreement, so future edits never change an
            already-issued document.
          </p>
          <textarea name="body" required rows={22} defaultValue={template?.body ?? ''}
            className={`${inputCls} font-mono text-xs leading-relaxed`} />
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">Agreement template saved.</Alert>}

      <Button type="submit" loading={pending} loadingText="Saving…">Save template</Button>
    </form>
  )
}

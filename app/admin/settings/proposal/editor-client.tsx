'use client'

import { useState } from 'react'
import { useAction } from '@/lib/hooks/use-action'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { saveProposalTemplate } from './actions'
import type { ProposalTemplate } from '@/lib/types'

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

const PLACEHOLDERS = [
  '[Client Full Name]', '[Tour Title]', '[Start Date]', '[Start Destination]', '[Number of Days]', '[Quote Number]',
]

export default function ProposalTemplateEditor({ template }: { template: ProposalTemplate | null }) {
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const { pending, run } = useAction()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setSaved(false)
    const fd = new FormData(e.currentTarget)
    run(async () => {
      try {
        await saveProposalTemplate(fd)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {template && <input type="hidden" name="id" value={template.id} />}

      <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Placeholders you can use</p>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map(p => (
            <code key={p} className="rounded bg-background px-1.5 py-0.5 text-[11px]">{p}</code>
          ))}
        </div>
        <p className="mt-2">They&rsquo;re replaced automatically when a proposal is sent to a client.</p>
      </div>

      <Field
        title="Cover letter (top of the proposal)"
        nameEn="coverIntroEn" nameAr="coverIntroAr"
        en={template?.cover_intro_en ?? ''} ar={template?.cover_intro_ar ?? ''}
        rows={7}
      />

      <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Proposal email</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Subject (English)</label>
            <input name="emailSubjectEn" defaultValue={template?.email_subject_en ?? ''} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Subject (Arabic)</label>
            <input name="emailSubjectAr" dir="rtl" defaultValue={template?.email_subject_ar ?? ''} className={inputCls} />
          </div>
        </div>
        <TextareaPair
          label="Message"
          nameEn="emailMessageEn" nameAr="emailMessageAr"
          en={template?.email_message_en ?? ''} ar={template?.email_message_ar ?? ''}
          rows={5}
        />
        <TextareaPair
          label="Signature"
          nameEn="emailSignatureEn" nameAr="emailSignatureAr"
          en={template?.email_signature_en ?? ''} ar={template?.email_signature_ar ?? ''}
          rows={3}
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">Saved.</Alert>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save template'}</Button>
      </div>
    </form>
  )
}

function Field({
  title, nameEn, nameAr, en, ar, rows,
}: {
  title: string
  nameEn: string
  nameAr: string
  en: string
  ar: string
  rows: number
}) {
  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <TextareaPair label="" nameEn={nameEn} nameAr={nameAr} en={en} ar={ar} rows={rows} />
    </div>
  )
}

function TextareaPair({
  label, nameEn, nameAr, en, ar, rows,
}: {
  label: string
  nameEn: string
  nameAr: string
  en: string
  ar: string
  rows: number
}) {
  const inputCls2 = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{label ? `${label} (English)` : 'English'}</label>
        <textarea name={nameEn} rows={rows} defaultValue={en} className={inputCls2} />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{label ? `${label} (Arabic)` : 'العربية'}</label>
        <textarea name={nameAr} dir="rtl" rows={rows} defaultValue={ar} className={inputCls2} />
      </div>
    </div>
  )
}

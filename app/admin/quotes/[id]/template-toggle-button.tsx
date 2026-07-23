'use client'

import { useRouter } from 'next/navigation'
import { useAction } from '@/lib/hooks/use-action'
import { setTemplateFlag } from '@/app/admin/tour-templates/actions'

export default function TemplateToggleButton({ quoteId, isTemplate }: { quoteId: string; isTemplate: boolean }) {
  const { pending, run } = useAction()
  const router = useRouter()

  function toggle() {
    const fd = new FormData()
    fd.set('quoteId', quoteId)
    fd.set('isTemplate', String(!isTemplate))
    run(async () => {
      await setTemplateFlag(fd)
      router.refresh()
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={isTemplate ? 'This quote is a reusable template' : 'Save this quote as a reusable template'}
      className={isTemplate
        ? 'rounded-md px-4 py-2 text-sm font-medium text-brand-ink bg-accent border border-primary-strong/40 hover:bg-accent'
        : 'rounded-md px-4 py-2 text-sm font-medium text-muted-foreground border border-border hover:bg-muted'}>
      {pending ? '…' : isTemplate ? '★ Template' : '☆ Save as template'}
    </button>
  )
}

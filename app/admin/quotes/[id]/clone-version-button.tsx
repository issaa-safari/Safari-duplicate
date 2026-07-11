'use client'

import { useTransition } from 'react'
import { cloneVersion } from './version-actions'

export default function CloneVersionButton({ quoteId, versionId }: { quoteId: string; versionId: string }) {
  const [pending, start] = useTransition()
  function handle() {
    const fd = new FormData()
    fd.set('quoteId', quoteId)
    fd.set('versionId', versionId)
    start(() => cloneVersion(fd))
  }
  return (
    <button
      onClick={handle}
      disabled={pending}
      title="Clone this version as a new draft"
      className="text-xs text-muted-foreground hover:text-brand-ink disabled:opacity-40 px-2 py-1 rounded border border-border hover:border-ring/40 transition"
    >
      {pending ? '…' : '⎘ Clone'}
    </button>
  )
}

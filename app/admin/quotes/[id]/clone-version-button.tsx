'use client'

import { useState } from 'react'
import { cloneVersionAndGo } from './clone-version'

export default function CloneVersionButton({ quoteId, versionId }: { quoteId: string; versionId: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function handle() {
    setPending(true)
    setError('')
    const err = await cloneVersionAndGo(quoteId, versionId)
    if (err) {
      setError(err)
      setPending(false)
    }
    // on success the browser navigates away — keep the pending state
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={handle}
        disabled={pending}
        title="Clone this version as a new draft"
        className="text-xs text-muted-foreground hover:text-brand-ink disabled:opacity-40 px-2 py-1 rounded border border-border hover:border-ring/40 transition"
      >
        {pending ? '…' : '⎘ Clone'}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  )
}

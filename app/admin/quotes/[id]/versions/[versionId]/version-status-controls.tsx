'use client'

import { useState, useTransition } from 'react'
import { setVersionStatus } from './actions'
import StatusBadge from '@/components/admin/status-badge'

const TRANSITIONS: Record<string, { to: string; label: string; style: string }[]> = {
  ready: [
    { to: 'draft', label: 'Revert to Draft', style: 'border border-gray-300 text-gray-600 hover:bg-gray-50' },
    { to: 'sent', label: 'Mark as Sent', style: 'bg-purple-600 hover:bg-purple-700 text-white' },
  ],
  sent: [
    { to: 'ready', label: 'Revert to Ready', style: 'border border-gray-300 text-gray-600 hover:bg-gray-50' },
  ],
}

export default function VersionStatusControls({
  quoteId,
  versionId,
  status,
}: {
  quoteId: string
  versionId: string
  status: string
}) {
  const [currentStatus, setCurrentStatus] = useState(status)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const actions = TRANSITIONS[currentStatus] ?? []

  function handleTransition(toStatus: string) {
    setError('')
    const fd = new FormData()
    fd.set('versionId', versionId)
    fd.set('quoteId', quoteId)
    fd.set('status', toStatus)
    startTransition(async () => {
      const result = await setVersionStatus(fd)
      if (result.error) setError(result.error)
      else setCurrentStatus(toStatus)
    })
  }

  if (actions.length === 0) return null

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Status:</span>
          <StatusBadge status={currentStatus} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {actions.map(action => (
            <button
              key={action.to}
              type="button"
              onClick={() => handleTransition(action.to)}
              disabled={pending}
              className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${action.style}`}
            >
              {pending ? 'Updating…' : action.label}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}

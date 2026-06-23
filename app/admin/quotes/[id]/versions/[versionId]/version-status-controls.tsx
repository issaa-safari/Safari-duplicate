'use client'

import { useState, useTransition } from 'react'
import { setVersionStatus } from './price-line-actions'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  ready: 'Ready',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
  cancelled: 'Cancelled',
  superseded: 'Superseded',
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  ready: 'bg-blue-100 text-blue-700',
  sent: 'bg-purple-100 text-purple-700',
  viewed: 'bg-indigo-100 text-indigo-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  expired: 'bg-amber-100 text-amber-700',
  superseded: 'bg-gray-100 text-gray-400',
  cancelled: 'bg-gray-100 text-gray-500',
}

const TRANSITIONS: Record<string, { to: string; label: string; style: string }[]> = {
  draft: [
    { to: 'ready', label: 'Mark as Ready', style: 'bg-blue-600 hover:bg-blue-700 text-white' },
  ],
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
      try {
        await setVersionStatus(fd)
        setCurrentStatus(toStatus)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status.')
      }
    })
  }

  if (actions.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Status:</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[currentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABELS[currentStatus] ?? currentStatus}
          </span>
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

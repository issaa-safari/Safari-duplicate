'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { STATUS_VARIANT, VARIANT_CLASSES } from '@/lib/status-colors'

export default function StageSelector({
  requestId,
  currentStage,
  stages,
}: {
  requestId: string
  currentStage: string
  stages: { key: string; label: string }[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(currentStage)
  const [error, setError] = useState('')

  async function handleStageChange(newStage: string) {
    if (newStage === active) return
    setLoading(true)
    setError('')
    setActive(newStage)

    try {
      const response = await fetch('/api/admin/update-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, stage: newStage }),
      })

      // A failure used to revert the highlight and say nothing, so the Archived
      // button — rejected by the API until group_80 — looked simply inert.
      // Whatever goes wrong now says so.
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || `Could not move this request to ${newStage.replace(/_/g, ' ')}.`)
      }
      router.refresh()
    } catch (err) {
      setActive(currentStage)
      setError(err instanceof Error ? err.message : 'Could not change the stage.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
      {stages.map(stage => (
        <button
          key={stage.key}
          onClick={() => handleStageChange(stage.key)}
          disabled={loading}
          className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
            active === stage.key
              ? VARIANT_CLASSES[STATUS_VARIANT[stage.key] ?? 'neutral'] + ' border-transparent'
              : 'bg-surface text-muted-foreground border-border hover:border-border'
          }`}
        >
          {stage.label}
        </button>
      ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
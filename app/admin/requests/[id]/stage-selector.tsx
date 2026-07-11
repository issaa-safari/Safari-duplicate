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

  async function handleStageChange(newStage: string) {
    if (newStage === active) return
    setLoading(true)
    setActive(newStage)

    try {
      const response = await fetch('/api/admin/update-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, stage: newStage }),
      })

      if (!response.ok) throw new Error('Failed to update stage')
      router.refresh()
    } catch (err) {
      setActive(currentStage)
    } finally {
      setLoading(false)
    }
  }

  return (
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
  )
}
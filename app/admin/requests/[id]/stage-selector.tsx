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

  // New / Working On / Open are computed from quote activity — read-only here.
  const COMPUTED = new Set(['new', 'working_on', 'open'])

  async function handleStageChange(newStage: string) {
    if (newStage === active) return
    if (COMPUTED.has(newStage)) return
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
    <div className="flex flex-wrap items-center gap-2">
      {stages.map(stage => {
        const isActive = active === stage.key
        const isComputed = COMPUTED.has(stage.key)
        if (isComputed) {
          // Read-only computed badge; only visible when it's the current stage
          // (or always dimmed to show the automatic early pipeline).
          return (
            <span
              key={stage.key}
              title="Set automatically from quote activity"
              className={`rounded-full px-3 py-1 text-xs font-medium border border-dashed cursor-default ${
                isActive
                  ? VARIANT_CLASSES[STATUS_VARIANT[stage.key] ?? 'neutral'] + ' border-transparent'
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}
            >
              {stage.label}
              {isActive && <span className="ml-1 opacity-60">·auto</span>}
            </span>
          )
        }
        return (
          <button
            key={stage.key}
            onClick={() => handleStageChange(stage.key)}
            disabled={loading}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
              isActive
                ? VARIANT_CLASSES[STATUS_VARIANT[stage.key] ?? 'neutral'] + ' border-transparent'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            {stage.label}
          </button>
        )
      })}
    </div>
  )
}
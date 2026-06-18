'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STAGE_COLORS: Record<string, string> = {
  new: 'bg-amber-100 text-amber-800 border-amber-300',
  working_on: 'bg-blue-100 text-blue-800 border-blue-300',
  open: 'bg-purple-100 text-purple-800 border-purple-300',
  pre_booked: 'bg-orange-100 text-orange-800 border-orange-300',
  booked: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  not_booked: 'bg-gray-100 text-gray-600 border-gray-300',
}

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
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(currentStage)

  async function handleStageChange(newStage: string) {
    if (newStage === active) return
    setLoading(true)
    setActive(newStage)

    await supabase
      .from('requests')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', requestId)

    setLoading(false)
    router.refresh()
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
              ? STAGE_COLORS[stage.key]
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
          }`}
        >
          {stage.label}
        </button>
      ))}
    </div>
  )
}

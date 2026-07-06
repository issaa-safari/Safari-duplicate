'use client'

import { useState, useTransition } from 'react'
import { savePreviewTheme, savePreviewLayout } from './preview-actions'
import type { SectionKey } from '@/components/quote/proposal-view'

const THEMES = [
  { key: 'classic', label: 'Classic' },
  { key: 'modern', label: 'Modern' },
  { key: 'safari', label: 'Safari' },
]
const LABELS: Record<SectionKey, string> = {
  cover: 'Cover', itinerary: 'Day-by-Day', inclusions: 'Inclusions', pricing: 'Pricing',
}

export default function PreviewControls({
  quoteId, versionId, theme, order,
}: {
  quoteId: string
  versionId: string
  theme: string
  order: SectionKey[]
}) {
  const [current, setCurrent] = useState(order)
  const [pending, startTransition] = useTransition()

  function setTheme(next: string) {
    const fd = new FormData()
    fd.set('quoteId', quoteId); fd.set('versionId', versionId); fd.set('theme', next)
    startTransition(() => savePreviewTheme(fd))
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= current.length) return
    const next = [...current]
    ;[next[i], next[j]] = [next[j], next[i]]
    setCurrent(next)
    const fd = new FormData()
    fd.set('quoteId', quoteId); fd.set('versionId', versionId); fd.set('layout', next.join(','))
    startTransition(() => savePreviewLayout(fd))
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Theme</p>
        <div className="flex gap-2">
          {THEMES.map(th => (
            <button key={th.key} onClick={() => setTheme(th.key)} disabled={pending}
              className={`rounded-md px-3 py-1.5 text-sm font-medium border transition ${
                theme === th.key ? 'bg-[var(--olive)]/10 border-[var(--olive)]/40 text-[var(--olive-dk)]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>{th.label}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Page order</p>
        <ul className="space-y-1.5">
          {current.map((key, i) => (
            <li key={key} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="w-6 text-gray-400 tabular-nums">{i + 1}.</span>
              <span className="flex-1">{LABELS[key]}</span>
              <button onClick={() => move(i, -1)} disabled={pending || i === 0}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1" aria-label="Move up">↑</button>
              <button onClick={() => move(i, 1)} disabled={pending || i === current.length - 1}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-30 px-1" aria-label="Move down">↓</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

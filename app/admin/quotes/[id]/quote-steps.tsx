'use client'

import Link from 'next/link'

type Step = 'itinerary' | 'pricing' | 'preview' | 'finish'

const STEPS: { key: Step; label: string; n: number }[] = [
  { key: 'itinerary', label: 'Day-by-Day', n: 1 },
  { key: 'pricing',   label: 'Pricing',    n: 2 },
  { key: 'preview',   label: 'Preview',    n: 3 },
  { key: 'finish',    label: 'Finish',     n: 4 },
]

export default function QuoteSteps({
  quoteId, versionId, active,
}: {
  quoteId: string
  versionId: string | null
  active: Step
}) {
  const href = (s: Step) => {
    switch (s) {
      case 'itinerary': return versionId ? `/admin/quotes/${quoteId}/versions/${versionId}` : `/admin/quotes/${quoteId}`
      case 'pricing':   return `/admin/trip-builder/${quoteId}`
      case 'preview':   return `/admin/quotes/${quoteId}/preview`
      case 'finish':    return `/admin/quotes/${quoteId}/finish`
    }
  }

  return (
    <nav className="flex items-center gap-1 overflow-x-auto py-1 mb-5">
      {STEPS.map((s, i) => {
        const isActive = s.key === active
        return (
          <div key={s.key} className="flex items-center">
            <Link
              href={href(s.key)}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                isActive
                  ? 'bg-[var(--olive)] text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                isActive ? 'bg-white/25' : 'bg-gray-200 text-gray-600'
              }`}>{s.n}</span>
              {s.label}
            </Link>
            {i < STEPS.length - 1 && <span className="mx-0.5 h-px w-4 bg-gray-300" />}
          </div>
        )
      })}
    </nav>
  )
}

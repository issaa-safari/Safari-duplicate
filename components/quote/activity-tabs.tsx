'use client'

import { useState } from 'react'
import type { ProposalActivity } from './proposal-view'

const OLIVE = '#7A9A4A'
const INK = '#232821'

export type ActivityGroup = { label: string; activities: ProposalActivity[] }

// Per-sub-day activity tabs for a multi-night stop (e.g. "Day 1 / Day 2"
// activities within one grouped page). Falls back to a plain list when there's
// a single group.
export default function ActivityTabs({
  groups,
  isArabic,
  heading,
}: {
  groups: ActivityGroup[]
  isArabic: boolean
  heading: string
}) {
  const [active, setActive] = useState(0)
  const multi = groups.length > 1
  const shown = groups[active] ?? groups[0]

  return (
    <aside className="self-start rounded-xl p-4" style={{ border: `1px solid ${OLIVE}44`, background: '#F7FAEE' }}>
      <p className="mb-2 text-sm font-bold" style={{ color: INK, fontFamily: 'var(--font-display, sans-serif)' }}>
        {heading}
      </p>

      {multi && (
        <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
          {groups.map((g, i) => {
            const on = i === active
            return (
              <button
                key={g.label}
                role="tab"
                aria-selected={on}
                onClick={() => setActive(i)}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition"
                style={on
                  ? { background: OLIVE, color: '#fff' }
                  : { background: '#fff', color: INK, border: `1px solid ${OLIVE}44` }}
              >
                {g.label}
              </button>
            )
          })}
        </div>
      )}

      <ul className="space-y-1.5">
        {shown.activities.map((a, ai) => (
          <li key={ai} className="flex gap-2 text-sm text-gray-700">
            <span aria-hidden="true" style={{ color: OLIVE }}>→</span>
            <span>
              {a.name}
              {a.moment && <span className="text-gray-400"> · {a.moment}</span>}
              {a.optional && <span className="text-amber-600"> · {isArabic ? 'اختياري' : 'optional'}</span>}
            </span>
          </li>
        ))}
        {shown.activities.length === 0 && (
          <li className="text-sm text-gray-400">{isArabic ? 'لا توجد أنشطة' : 'No activities'}</li>
        )}
      </ul>
    </aside>
  )
}

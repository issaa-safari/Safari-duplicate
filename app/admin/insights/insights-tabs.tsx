'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Analytics', href: '/admin/insights' },
  { label: 'Activity', href: '/admin/insights/activity' },
]

// Shared header + tab bar for the Insights module (Analytics · Activity log).
export default function InsightsTabs() {
  const pathname = usePathname()
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Insights</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Quote-pipeline performance, revenue, and the activity log
      </p>
      <nav aria-label="Insights sections" className="mt-4 flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = pathname === t.href
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-primary text-brand-ink'
                  : 'border-transparent text-muted-foreground hover:text-brand-ink'
              }`}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

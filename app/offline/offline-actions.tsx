'use client'

import { RotateCw } from 'lucide-react'

// Reload the last-attempted route once the connection is back. Kept as a tiny
// client island so the offline page itself stays a static, always-cacheable
// server component the service worker can serve without a network round-trip.
export default function RetryButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity active:opacity-80"
    >
      <RotateCw size={16} aria-hidden />
      Try again
    </button>
  )
}

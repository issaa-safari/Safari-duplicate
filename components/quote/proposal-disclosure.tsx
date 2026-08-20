'use client'

import { useState, type ReactNode } from 'react'

// A day on the proposal, collapsed to its header until opened — the same
// read-the-shape-first behaviour the public departure pages get from
// ItineraryRouteLine. The header is always visible so the itinerary can be
// skimmed end to end; the body loads with the page (it is server-rendered
// children) and is only hidden, so printing and in-page search still see it.
//
// `defaultOpen` opens the first day, so the proposal never lands on a wall of
// closed rows with nothing to read.

export default function ProposalDisclosure({
  header,
  children,
  defaultOpen = false,
  openLabel,
  closeLabel,
}: {
  header: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  openLabel: string
  closeLabel: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-start"
      >
        <span className="min-w-0 flex-1">{header}</span>
        <span
          aria-hidden="true"
          className="shrink-0 text-lg leading-none transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: '#6E6A59' }}
        >
          ⌄
        </span>
        <span className="sr-only">{open ? closeLabel : openLabel}</span>
      </button>

      {/* Hidden rather than unmounted: `print:block` puts every day back for
          the printed proposal even if the reader left them collapsed. */}
      <div className={open ? 'block' : 'hidden print:block'}>{children}</div>
    </div>
  )
}

import type { ReactNode } from 'react'

/**
 * Admin section header in the redesign's house style: an olive step/icon chip,
 * a serif (Playfair) title, and an optional right-hand slot for meta or actions.
 * Use it above a card/grid to give every workspace section the same structure.
 */
export function SectionHeader({
  step,
  icon,
  title,
  hint,
  right,
  className = '',
}: {
  /** A step number (1, 2, …) shown in the olive chip. */
  step?: number
  /** An icon shown in the chip instead of a number (e.g. a small inline SVG). */
  icon?: ReactNode
  title: string
  /** Muted sub-line under the title. */
  hint?: string
  /** Right-aligned meta or actions (wins over `hint` for the right column). */
  right?: ReactNode
  className?: string
}) {
  const chip = step != null || icon != null
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 ${className}`}>
      <div className="flex items-center gap-2.5">
        {chip && (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary-strong text-[11px] font-bold text-white shadow-sm">
            {step != null ? step : icon}
          </span>
        )}
        <div>
          <h3 className="font-display text-base font-semibold leading-tight text-foreground">{title}</h3>
          {hint && !right && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {right && <div className="text-xs text-muted-foreground">{right}</div>}
    </div>
  )
}

/** Small inline route/pin glyph for itinerary sections. */
export function RouteIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 13.5C4 13.5 1.5 9.8 1.5 6.5A2.5 2.5 0 0 1 6.5 6.5C6.5 8 5 10 4 13.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="4" cy="6.3" r="0.9" fill="currentColor" />
      <path d="M9.5 3.5h3a1.8 1.8 0 0 1 0 3.6H8a1.8 1.8 0 0 0 0 3.6h4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.2 2.3" />
    </svg>
  )
}

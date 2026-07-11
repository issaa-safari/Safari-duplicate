import Link from 'next/link'
import { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

/**
 * One container rhythm for every admin screen. Widths:
 *  - default: standard module pages (max-w-7xl)
 *  - narrow:  focused forms (max-w-2xl)
 *  - form:    editorial forms / settings (max-w-5xl)
 */
const WIDTH: Record<string, string> = {
  default: 'max-w-7xl',
  form: 'max-w-5xl',
  narrow: 'max-w-2xl',
}

export function PageShell({
  width = 'default',
  className = '',
  children,
}: {
  width?: keyof typeof WIDTH
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`mx-auto ${WIDTH[width]} px-4 py-6 sm:px-6 ${className}`}>
      {children}
    </div>
  )
}

/**
 * Standard page header: serif title (the workspace's one display flourish),
 * optional subtitle, back link, and a right-aligned action slot.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  backHref,
  backLabel,
  meta,
  className = '',
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  backHref?: string
  backLabel?: string
  /** Small inline metadata row under the title (badges, refs, dates). */
  meta?: ReactNode
  className?: string
}) {
  return (
    <header className={`mb-6 ${className}`}>
      {backHref && (
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-brand-ink"
        >
          <ArrowLeft size={14} aria-hidden />
          {backLabel ?? 'Back'}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {meta && (
            <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  )
}

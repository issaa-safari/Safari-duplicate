import { ReactNode } from 'react'

/**
 * Lovable-design admin page header: Playfair title in brand green, muted
 * subtitle, right-aligned actions. Server-safe (no client hooks).
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
  className = '',
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-brand-ink md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

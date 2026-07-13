import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/**
 * Empty states teach the interface: what this area shows, how it fills,
 * and (when possible) the action that fills it.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  compact = false,
}: {
  icon?: LucideIcon
  title: ReactNode
  body?: ReactNode
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'px-4 py-8' : 'px-6 py-14'
      }`}
    >
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon size={18} aria-hidden />
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {body && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

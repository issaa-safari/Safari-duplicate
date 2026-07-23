import Link from 'next/link'
import { ReactNode } from 'react'

/** Tonal card: quiet border + surface, structural shadow only. */
export function Card({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={`rounded-xl border border-border bg-surface shadow-sm ${className}`}
    >
      {children}
    </section>
  )
}

export function CardHeader({
  title,
  action,
  className = '',
}: {
  title: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-t-xl border-b border-border bg-surface-alt px-4 py-3 sm:px-5 ${className}`}
    >
      <h2 className="font-display text-[15px] font-semibold leading-tight text-foreground">{title}</h2>
      {action}
    </div>
  )
}

export function CardBody({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={`px-4 py-4 sm:px-5 ${className}`}>{children}</div>
}

/**
 * KPI stat. `tone` colors the value; `emphasis` makes the tile the focal
 * point of a stat row (dashboard hierarchy: actionable numbers pop, ambient
 * ones stay quiet).
 */
export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
  emphasis = false,
  href,
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'positive' | 'negative' | 'brand'
  emphasis?: boolean
  href?: string
}) {
  const toneCls = {
    default: 'text-foreground',
    positive: 'text-brand-text',
    negative: 'text-destructive',
    brand: 'text-brand-ink',
  }[tone]
  const inner = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1.5 text-[26px] font-semibold tabular-nums tracking-tight ${toneCls}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </>
  )
  const shellCls = `rounded-xl border px-4 py-3.5 shadow-sm transition-colors duration-150 ${
    emphasis ? 'border-brand-ink/25 bg-accent/60' : 'border-border bg-surface'
  }`
  if (href) {
    return (
      <Link href={href} className={`block ${shellCls} hover:border-ring/50`}>
        {inner}
      </Link>
    )
  }
  return <div className={shellCls}>{inner}</div>
}

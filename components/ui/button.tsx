import Link from 'next/link'
import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-text'
type Size = 'sm' | 'md' | 'icon'

const BASE_CLS =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium ' +
  'transition-colors duration-150 disabled:cursor-not-allowed ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

const VARIANT_CLS: Record<Variant, string> = {
  primary:
    'bg-primary-strong text-white hover:bg-primary-strong-hover disabled:opacity-60',
  secondary:
    'border border-border bg-surface text-foreground hover:bg-muted disabled:opacity-50',
  ghost:
    'text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50',
  danger:
    'bg-destructive text-white hover:opacity-90 disabled:opacity-60',
  'danger-text':
    'text-destructive hover:opacity-80 disabled:opacity-40',
}

const SIZE_CLS: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-6 py-2.5 text-sm',
  icon: 'h-9 w-9 p-0',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  loadingText?: string
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  loadingText,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${BASE_CLS} ${VARIANT_CLS[variant]} ${SIZE_CLS[size]} ${className}`}
      {...props}
    >
      {loading ? (loadingText ?? 'Saving…') : children}
    </button>
  )
}

export function ButtonLink({
  href,
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
}: {
  href: string
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={`${BASE_CLS} ${VARIANT_CLS[variant]} ${SIZE_CLS[size]} ${className}`}
    >
      {children}
    </Link>
  )
}

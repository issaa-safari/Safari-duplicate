import { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react'

/**
 * Shared table anatomy for admin data lists. Renders the standard shell
 * (tonal header band, hairline rows) and stacks into label/value cards on
 * phones via the existing `.stack-table` mechanism — pass `data-label` on
 * each `<Td>`.
 */
export function Table({
  className = '',
  minWidth,
  children,
}: {
  className?: string
  /** e.g. 'min-w-[640px]' — desktop floor before stacking kicks in */
  minWidth?: string
  children: ReactNode
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`stack-table w-full text-sm ${minWidth ?? ''} ${className}`}>
        {children}
      </table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border bg-surface-alt text-left">
        {children}
      </tr>
    </thead>
  )
}

export function Th({
  className = '',
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <th
      className={`px-4 py-2.5 text-xs font-semibold text-muted-foreground ${className}`}
      {...props}
    >
      {children}
    </th>
  )
}

export function Tr({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <tr
      className={`border-b border-border/70 transition-colors duration-150 last:border-0 hover:bg-surface-alt ${className}`}
    >
      {children}
    </tr>
  )
}

export function Td({
  className = '',
  children,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <td className={`px-4 py-3 align-middle ${className}`} {...props}>
      {children}
    </td>
  )
}

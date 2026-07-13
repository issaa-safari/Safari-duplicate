/** Loading placeholder blocks (see .admin-skeleton in globals.css). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`admin-skeleton ${className}`} />
}

/** Table-shaped loading state: header band + n rows. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  )
}

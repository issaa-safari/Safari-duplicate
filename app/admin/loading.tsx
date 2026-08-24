import { Skeleton } from '@/components/admin/ui/skeleton'

export default function AdminLoading() {
  return (
    <div className="admin-container space-y-6 py-8" aria-label="Loading page" aria-busy="true">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

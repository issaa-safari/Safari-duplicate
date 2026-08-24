'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { BedDouble, ClipboardCheck, FileSignature, LayoutDashboard, PackageCheck, PlaneLanding, Users } from 'lucide-react'

const items = [
  { key: 'overview', label: 'Overview', suffix: '', icon: LayoutDashboard },
  { key: 'travellers', label: 'Travellers', suffix: '/manifest?view=travellers', icon: Users },
  { key: 'logistics', label: 'Logistics', suffix: '/manifest?view=logistics', icon: PlaneLanding },
  { key: 'tasks', label: 'Tasks', suffix: '/tasks', icon: ClipboardCheck },
  { key: 'agreements', label: 'Agreements', suffix: '/manifest?view=agreements', icon: FileSignature },
  { key: 'vouchers', label: 'Vouchers', suffix: '/vouchers', icon: BedDouble },
  { key: 'trip-pack', label: 'Trip Pack', suffix: '/trip-pack', icon: PackageCheck },
]

export default function DepartureOperationsNav({
  departureId,
  activeOverride,
}: {
  departureId: string
  activeOverride?: 'vouchers' | 'trip-pack'
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const root = `/admin/departures/${departureId}`
  const manifestView = searchParams.get('view') ?? 'travellers'

  return (
    <nav aria-label="Departure workspace" className="overflow-x-auto border-b border-border">
      <div className="flex min-w-max gap-1">
        {items.map(({ key, label, suffix, icon: Icon }) => {
          const href = key === 'vouchers'
            ? `/admin/vouchers?departure=${departureId}`
            : `${root}${suffix}`
          let active = false
          if (activeOverride === 'vouchers') active = key === 'vouchers'
          else if (activeOverride === 'trip-pack') active = key === 'trip-pack'
          else if (key === 'overview') active = pathname === root
          else if (key === 'tasks') active = pathname.startsWith(`${root}/tasks`)
          else if (key === 'trip-pack') active = pathname.startsWith(`${root}/trip-pack`)
          else if (key === 'travellers' || key === 'logistics' || key === 'agreements') {
            active = pathname.startsWith(`${root}/manifest`) && manifestView === key
          }

          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex items-center gap-2 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors ${
                active ? 'text-brand-ink' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={15} aria-hidden />
              {label}
              {active && <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

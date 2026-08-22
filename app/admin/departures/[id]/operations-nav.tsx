'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BedDouble, ClipboardCheck, FileSignature, LayoutDashboard, Users } from 'lucide-react'

const items = [
  { label: 'Overview', suffix: '', icon: LayoutDashboard },
  { label: 'Manifest & logistics', suffix: '/manifest', icon: Users },
  { label: 'Tasks', suffix: '/tasks', icon: ClipboardCheck },
  { label: 'Vouchers', suffix: '/vouchers', icon: BedDouble },
  { label: 'Agreement setup', suffix: '/agreement', icon: FileSignature },
]

export default function DepartureOperationsNav({
  departureId,
  activeOverride,
}: {
  departureId: string
  activeOverride?: 'vouchers'
}) {
  const pathname = usePathname()
  const root = `/admin/departures/${departureId}`

  return (
    <nav aria-label="Departure workspace" className="overflow-x-auto border-b border-border">
      <div className="flex min-w-max gap-1">
        {items.map(({ label, suffix, icon: Icon }) => {
          const href = suffix === '/vouchers'
            ? `/admin/vouchers?departure=${departureId}`
            : suffix === '/agreement'
              ? '/admin/agreements'
              : `${root}${suffix}`
          const active = activeOverride === 'vouchers'
            ? suffix === '/vouchers'
            : suffix === ''
            ? pathname === root
            : suffix === '/manifest'
              ? pathname.startsWith(`${root}/manifest`)
              : suffix === '/tasks'
                ? pathname.startsWith(`${root}/tasks`)
                : false

          return (
            <Link
              key={label}
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

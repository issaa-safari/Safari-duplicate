import Link from 'next/link'
import {
  Map, Tent, Compass, Mountain, Car, Users, Settings, LibraryBig,
} from 'lucide-react'

const MAIN_CONTENT = [
  { key: 'destinations', href: '/admin/content/destinations', label: 'Destinations', icon: Map },
  { key: 'accommodations', href: '/admin/content/accommodations', label: 'Accommodations', icon: Tent },
  { key: 'activities', href: '/admin/content/activities', label: 'Activities', icon: Compass },
  { key: 'parks', href: '/admin/content/parks', label: 'Parks & Reserves', icon: Mountain },
]

const COMPANY_CONTENT = [
  { key: 'vehicles', href: '/admin/content/vehicles', label: 'Vehicles', icon: Car },
  { key: 'staff', href: '/admin/content/staff', label: 'Tour Staff', icon: Users },
]

function NavGroup({
  title,
  items,
  active,
}: {
  title: string
  items: typeof MAIN_CONTENT
  active?: string
}) {
  return (
    <div className="mb-7">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = active === item.key
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors duration-150 ${
                isActive
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon size={15} aria-hidden className={isActive ? 'text-accent-foreground' : 'text-muted-foreground'} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function ContentShell({
  active,
  title,
  children,
}: {
  active?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2.5 text-xl font-semibold text-foreground">
          <LibraryBig size={20} aria-hidden className="text-brand-ink" />
          {title}
        </h1>
      </header>

      {/* Section nav: rail on desktop, horizontal chips on smaller screens */}
      <nav aria-label="Content sections" className="mb-5 flex gap-1.5 overflow-x-auto lg:hidden">
        {[...MAIN_CONTENT, ...COMPANY_CONTENT].map((item) => {
          const isActive = active === item.key
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                isActive ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <NavGroup title="Main Content" items={MAIN_CONTENT} active={active} />
          <NavGroup title="Company Content" items={COMPANY_CONTENT} active={active} />
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Other</h3>
            <Link
              href="/admin/settings"
              className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            >
              <Settings size={15} aria-hidden />
              <span>Your Library Settings</span>
            </Link>
          </div>
        </aside>

        <section className="min-w-0">
          {children}
        </section>
      </div>
    </div>
  )
}

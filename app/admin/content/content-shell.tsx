import Link from 'next/link'

const MAIN_CONTENT = [
  { key: 'destinations', href: '/admin/content/destinations', label: 'Destinations', icon: '✣' },
  { key: 'accommodations', href: '/admin/content/accommodations', label: 'Accommodations', icon: '⌂' },
  { key: 'activities', href: '/admin/content/activities', label: 'Activities', icon: '□' },
  { key: 'parks', href: '/admin/content/parks', label: 'Parks & Reserves', icon: '⛰' },
]

const COMPANY_CONTENT = [
  { key: 'vehicles', href: '/admin/content/vehicles', label: 'Vehicles', icon: '▰' },
  { key: 'staff', href: '/admin/content/staff', label: 'Tour Staff', icon: '♙' },
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
      <h3 className="mb-2 text-xs font-semibold text-foreground">{title}</h3>
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = active === item.key
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-2 border-b border-border px-2 py-2 text-sm transition ${
                isActive
                  ? 'bg-accent font-semibold text-[var(--olive-dk)]'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground'
              }`}
            >
              <span className="w-4 text-center text-muted-foreground">{item.icon}</span>
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
  icon = '▧',
  children,
}: {
  active?: string
  title: string
  icon?: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 border-b border-border bg-surface px-4 py-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <span className="text-xl text-muted-foreground">{icon}</span>
          {title}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <NavGroup title="Main Content" items={MAIN_CONTENT} active={active} />
          <NavGroup title="Company Content" items={COMPANY_CONTENT} active={active} />
          <div>
            <h3 className="mb-2 text-xs font-semibold text-foreground">Other</h3>
            <Link
              href="/admin/settings"
              className="flex items-center gap-2 border-b border-border px-2 py-2 text-sm text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <span className="w-4 text-center text-muted-foreground">⚙</span>
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

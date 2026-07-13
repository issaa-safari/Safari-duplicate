import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Map, Tent, Compass, Mountain, Car, Users,
  type LucideIcon,
} from 'lucide-react'
import ContentShell from './content-shell'

interface CardProps {
  href: string
  title: string
  description: string
  count: number | null
  icon: LucideIcon
}

function ContentCard({ href, title, description, count, icon: Icon }: CardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-all duration-150 hover:border-ring/50 hover:shadow">
      <div className="mb-3 flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon size={18} aria-hidden />
        </span>
        {count !== null && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-foreground transition-colors duration-150 group-hover:text-brand-ink">{title}</h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
    </Link>
  )
}

export default async function ContentLibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  const [
    { count: destCount },
    { count: accomCount },
    { count: actCount },
    { count: parksCount },
    { count: vehicleCount },
    { count: staffCount },
  ] = await Promise.all([
    admin.from('destinations').select('*', { count: 'exact', head: true }),
    admin.from('accommodations').select('*', { count: 'exact', head: true }),
    admin.from('activities').select('*', { count: 'exact', head: true }),
    admin.from('parks').select('*', { count: 'exact', head: true }),
    admin.from('vehicles').select('*', { count: 'exact', head: true }),
    admin.from('tour_staff').select('*', { count: 'exact', head: true }),
  ])

  return (
    <ContentShell title="Your Content Library">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Manage the reusable content that powers tour pages and itineraries</p>
      </div>

      {/* Main Content */}
      <div className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Main Content</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ContentCard
            href="/admin/content/destinations"
            title="Destinations"
            description="Parks, regions, and locations featured in tours"
            count={destCount}
            icon={Map}
          />
          <ContentCard
            href="/admin/content/accommodations"
            title="Accommodations"
            description="Lodges, camps, hotels, and villas"
            count={accomCount}
            icon={Tent}
          />
          <ContentCard
            href="/admin/content/activities"
            title="Activities"
            description="Game drives, bush walks, balloon rides, and more"
            count={actCount}
            icon={Compass}
          />
          <ContentCard
            href="/admin/content/parks"
            title="Parks & Reserves"
            description="National parks, game reserves, and conservancies with entrance fees"
            count={parksCount}
            icon={Mountain}
          />
        </div>
      </div>

      {/* Company Content */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Content</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ContentCard
            href="/admin/content/vehicles"
            title="Vehicles"
            description="Safari jeeps, vans, and motorbikes in your fleet"
            count={vehicleCount}
            icon={Car}
          />
          <ContentCard
            href="/admin/content/staff"
            title="Tour Staff"
            description="Guides, drivers, chefs, and coordinators"
            count={staffCount}
            icon={Users}
          />
        </div>
      </div>
    </ContentShell>
  )
}

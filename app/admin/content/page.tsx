import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ContentShell from './content-shell'

interface CardProps {
  href: string
  title: string
  description: string
  count: number | null
  icon: string
}

function ContentCard({ href, title, description, count, icon }: CardProps) {
  return (
    <Link
      href={href}
      className="bg-white rounded-lg border border-gray-200 p-5 hover:border-[var(--olive)] hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {count !== null && (
          <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            {count}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 group-hover:text-[var(--olive)] transition-colors">{title}</h3>
      <p className="text-sm text-gray-500 mt-0.5">{description}</p>
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
        <p className="text-sm text-gray-500">Manage the reusable content that powers tour pages and itineraries</p>
      </div>

      {/* Main Content */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Main Content</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ContentCard
            href="/admin/content/destinations"
            title="Destinations"
            description="Parks, regions, and locations featured in tours"
            count={destCount}
            icon="🗺️"
          />
          <ContentCard
            href="/admin/content/accommodations"
            title="Accommodations"
            description="Lodges, camps, hotels, and villas"
            count={accomCount}
            icon="🏕️"
          />
          <ContentCard
            href="/admin/content/activities"
            title="Activities"
            description="Game drives, bush walks, balloon rides, and more"
            count={actCount}
            icon="🦁"
          />
          <ContentCard
            href="/admin/content/parks"
            title="Parks & Reserves"
            description="National parks, game reserves, and conservancies with entrance fees"
            count={parksCount}
            icon="⛰️"
          />
        </div>
      </div>

      {/* Company Content */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Company Content</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ContentCard
            href="/admin/content/vehicles"
            title="Vehicles"
            description="Safari jeeps, vans, and motorbikes in your fleet"
            count={vehicleCount}
            icon="🚙"
          />
          <ContentCard
            href="/admin/content/staff"
            title="Tour Staff"
            description="Guides, drivers, chefs, and coordinators"
            count={staffCount}
            icon="👤"
          />
        </div>
      </div>
    </ContentShell>
  )
}

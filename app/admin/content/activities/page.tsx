import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ButtonLink } from '@/components/ui/button'
import ContentShell from '../content-shell'
import ContentDirectory, { type DirectoryItem } from '@/components/admin/content-directory'

export default async function ActivitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: activities } = await admin
    .from('activities')
    .select('id, name, cover_image_url, is_active, destinations(name, country)')
    .order('name', { ascending: true })

  const items: DirectoryItem[] = (activities ?? []).map((a: any) => {
    const destination = a.destinations?.name ?? null
    const country = a.destinations?.country ?? null
    return {
      id: a.id,
      name: a.name,
      href: `/admin/content/activities/${a.id}`,
      imageUrl: a.cover_image_url ?? null,
      location: destination,
      country,
      mapsQuery: [a.name, destination, country].filter(Boolean).join(', '),
      badges: [],
      active: a.is_active ?? true,
      facets: { country },
    }
  })

  return (
    <ContentShell active="activities" title="Activities">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Activities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage activities used in tour itineraries</p>
        </div>
        <ButtonLink href="/admin/content/activities/new" size="sm">+ New Activity</ButtonLink>
      </div>

      <ContentDirectory
        items={items}
        noun={{ singular: 'activity', plural: 'activities' }}
        placeholderIcon="□"
        facetDefs={[{ key: 'country', label: 'Country' }]}
      />
    </ContentShell>
  )
}

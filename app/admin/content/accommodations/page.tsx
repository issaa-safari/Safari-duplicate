import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ButtonLink } from '@/components/ui/button'
import ContentShell from '../content-shell'
import ContentDirectory, { type DirectoryItem } from '@/components/admin/content-directory'
import { ACCOMMODATION_TIER_BADGE_CLASSES as TIER_STYLES, ACCOMMODATION_TIER_LABELS_EN as TIER_LABELS } from '@/lib/accommodation-tiers'

export default async function AccommodationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: accommodations } = await admin
    .from('accommodations')
    .select('id, name, type, budget_tier, rating, cover_image_url, is_active, destinations(name, country)')
    .order('name', { ascending: true })

  const items: DirectoryItem[] = (accommodations ?? []).map((a: any) => {
    const destination = a.destinations?.name ?? null
    const country = a.destinations?.country ?? null
    const badges = []
    if (a.type) badges.push({ label: String(a.type).replace(/_/g, ' '), className: 'bg-accent text-accent-foreground' })
    if (a.budget_tier) {
      const tier = a.budget_tier as keyof typeof TIER_LABELS
      badges.push({
        label: TIER_LABELS[tier] ?? a.budget_tier,
        className: TIER_STYLES[tier] ?? 'bg-muted text-muted-foreground',
      })
    }
    return {
      id: a.id,
      name: a.name,
      href: `/admin/content/accommodations/${a.id}`,
      imageUrl: a.cover_image_url ?? null,
      location: destination,
      country,
      mapsQuery: [a.name, destination, country].filter(Boolean).join(', '),
      badges,
      rating: a.rating ?? null,
      active: a.is_active ?? true,
      facets: {
        country: country,
        type: a.type ?? null,
        class: a.budget_tier ?? null,
      },
    }
  })

  return (
    <ContentShell active="accommodations" title="Accommodations">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Accommodations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage lodges, camps, and hotels used in itineraries</p>
        </div>
        <ButtonLink href="/admin/content/accommodations/new" size="sm">+ New Accommodation</ButtonLink>
      </div>

      <ContentDirectory
        items={items}
        noun={{ singular: 'accommodation', plural: 'accommodations' }}
        placeholderIcon="⌂"
        facetDefs={[
          { key: 'country', label: 'Country' },
          { key: 'type', label: 'Accommodation Type' },
          { key: 'class', label: 'Class' },
        ]}
      />
    </ContentShell>
  )
}

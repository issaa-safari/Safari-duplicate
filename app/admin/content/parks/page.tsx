import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ButtonLink } from '@/components/ui/button'
import ContentShell from '../content-shell'
import ContentDirectory, { type DirectoryItem } from '@/components/admin/content-directory'

const TYPE_LABELS: Record<string, string> = {
  national_park:  'National Park',
  game_reserve:   'Game Reserve',
  conservancy:    'Conservancy',
  marine_park:    'Marine Park',
  forest_reserve: 'Forest Reserve',
  other:          'Other',
}

export default async function ParksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: parks } = await admin
    .from('parks')
    .select('id, name, country, park_type, cover_image_url, is_active')
    .order('country')
    .order('name')

  const items: DirectoryItem[] = (parks ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    href: `/admin/content/parks/${p.id}`,
    imageUrl: p.cover_image_url ?? null,
    location: null,
    country: p.country ?? null,
    mapsQuery: [p.name, p.country].filter(Boolean).join(', '),
    badges: p.park_type
      ? [{ label: TYPE_LABELS[p.park_type] ?? p.park_type, className: 'bg-accent text-accent-foreground' }]
      : [],
    active: p.is_active ?? true,
    facets: {
      country: p.country ?? null,
      type: p.park_type ?? null,
    },
  }))

  return (
    <ContentShell active="parks" title="Parks & Reserves">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Parks & Reserves</h1>
          <p className="text-sm text-muted-foreground mt-0.5">National parks, game reserves, and conservancies with entrance fees</p>
        </div>
        <ButtonLink href="/admin/content/parks/new" size="sm">+ New Park</ButtonLink>
      </div>

      <ContentDirectory
        items={items}
        noun={{ singular: 'park', plural: 'parks' }}
        placeholderIcon="⛰"
        facetDefs={[
          { key: 'country', label: 'Country' },
          { key: 'type', label: 'Type' },
        ]}
      />
    </ContentShell>
  )
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ContentShell from '../content-shell'
import FleetClient from './fleet-client'
import type { Motorbike } from '@/lib/types'

export default async function MotorbikesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: bikes } = await admin
    .from('motorbikes')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  return (
    <ContentShell active="motorbikes" title="Motorbikes">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Motorbike Fleet</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bikes available to assign to riders on fixed departures
        </p>
      </div>
      <FleetClient bikes={(bikes as Motorbike[]) ?? []} />
    </ContentShell>
  )
}

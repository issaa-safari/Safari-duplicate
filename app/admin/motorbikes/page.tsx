import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
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
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Motorbike Fleet</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Bikes available to assign to riders on fixed departures
        </p>
      </div>
      <FleetClient bikes={(bikes as Motorbike[]) ?? []} />
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import TripBuilderForm from './trip-builder-form'
import { loadBuilderLookups } from './load-lookups'

export default async function TripBuilderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const lookups = await loadBuilderLookups(admin)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-foreground">Trip Builder</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Build a quote on one screen — rates resolve by travel date, one Save writes everything.
        </p>
      </div>
      <TripBuilderForm {...lookups} />
    </div>
  )
}

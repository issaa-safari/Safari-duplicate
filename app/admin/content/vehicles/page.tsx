import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ButtonLink, Button } from '@/components/ui/button'
import ContentShell from '../content-shell'

const TYPE_LABELS: Record<string, string> = {
  jeep: 'Jeep',
  van: 'Van',
  bus: 'Bus',
  motorbike: 'Motorbike',
  boat: 'Boat',
}

export default async function VehiclesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: vehicles } = await admin
    .from('vehicles')
    .select('id, name, type, seats, count, image_url, is_active')
    .order('name', { ascending: true })

  return (
    <ContentShell active="vehicles" title="Vehicles">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Vehicles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage vehicles available for tours</p>
        </div>
        <ButtonLink href="/admin/content/vehicles/new" size="sm">+ New Vehicle</ButtonLink>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {!vehicles || vehicles.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">No vehicles added yet.</p>
            <Link href="/admin/content/vehicles/new" className="text-sm font-medium text-brand-text hover:underline">
              Add your first vehicle
            </Link>
          </div>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Seats</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Count</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v: any) => (
                <tr key={v.id} className="border-b border-border/70 last:border-0 hover:bg-muted">
                  <td data-label="Name" className="px-4 py-3 font-medium text-foreground">{v.name}</td>
                  <td data-label="Type" className="px-4 py-3 text-muted-foreground hidden sm:table-cell capitalize">
                    {TYPE_LABELS[v.type] ?? v.type}
                  </td>
                  <td data-label="Seats" className="px-4 py-3 text-muted-foreground hidden md:table-cell">{v.seats}</td>
                  <td data-label="Count" className="px-4 py-3 text-muted-foreground hidden md:table-cell">{v.count}</td>
                  <td data-label="Status" className="px-4 py-3">
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' +
                      (v.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground')}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ButtonLink href={'/admin/content/vehicles/' + v.id} size="sm">Edit</ButtonLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ContentShell>
  )
}

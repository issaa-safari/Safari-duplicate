import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button'
import ContentShell from '../content-shell'
import type { Service } from '@/lib/types'

const UNIT_LABEL: Record<string, string> = {
  person: 'per person',
  booking: 'per booking',
}

export default async function ServicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data } = await admin
    .from('services')
    .select('id, name_en, name_ar, description_en, default_price_usd, pricing_unit, is_active, sort_order')
    .order('sort_order')
    .order('name_en')

  const services = (data ?? []) as Service[]

  return (
    <ContentShell active="services" title="Add-on Services">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Add-on Services</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visas, insurance and anything else sold alongside a trip. Priced separately from the itinerary.
          </p>
        </div>
        <ButtonLink href="/admin/content/services/new" size="sm">+ New Service</ButtonLink>
      </div>

      {services.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No services yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">Service</th>
                <th className="px-4 py-3 text-start font-semibold">Arabic</th>
                <th className="px-4 py-3 text-end font-semibold">Price</th>
                <th className="px-4 py-3 text-start font-semibold">Charged</th>
                <th className="px-4 py-3 text-start font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {services.map((s) => (
                <tr key={s.id} className={s.is_active ? '' : 'opacity-60'}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/content/services/${s.id}`} className="font-medium text-foreground hover:underline">
                      {s.name_en}
                    </Link>
                    {s.description_en && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{s.description_en}</p>
                    )}
                  </td>
                  <td dir="auto" className="px-4 py-3 text-muted-foreground">{s.name_ar || '—'}</td>
                  <td className="px-4 py-3 text-end font-medium tabular-nums text-foreground">
                    ${Number(s.default_price_usd).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {UNIT_LABEL[s.pricing_unit] ?? s.pricing_unit}
                  </td>
                  <td className="px-4 py-3">
                    {s.is_active ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">Active</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Retired</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Editing a price here changes what future trips are quoted. Trips that already bought a service keep the
        price they were sold at.
      </p>
    </ContentShell>
  )
}

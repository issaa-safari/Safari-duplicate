import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ButtonLink, Button } from '@/components/ui/button'
import { label } from './constants'
import ContentShell from '../content-shell'

export default async function SupplierRatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: cards } = await admin
    .from('supplier_rate_cards')
    .select('id, name, supplier_name, entity_type, cost_category, valid_from, valid_to, currency, is_active, supplier_rates(count)')
    .order('valid_from', { ascending: false })

  return (
    <ContentShell active="rates" title="Supplier Rates" icon="$">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Supplier Rates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Seasonal reusable costs used by the Quote Builder</p>
        </div>
        <ButtonLink href="/admin/content/rates/new" size="sm">+ New Rate Card</ButtonLink>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {!cards?.length ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500 mb-3">No supplier rate cards yet.</p>
            <Link href="/admin/content/rates/new" className="text-sm font-medium text-[var(--olive)] hover:underline">Create the first rate card</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="stack-table w-full text-sm">
              <thead><tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Rate Card</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Season</th>
                <th className="px-4 py-3 font-medium">Rates</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr></thead>
              <tbody>
                {cards.map((card: any) => (
                  <tr key={card.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td data-label="Rate Card" className="px-4 py-3">
                      <p className="font-medium text-gray-900">{card.name}</p>
                      <p className="text-xs text-gray-400">{card.supplier_name || 'No supplier'} · {card.currency}</p>
                    </td>
                    <td data-label="Category" className="px-4 py-3 text-gray-600">
                      <p>{label(card.entity_type)}</p><p className="text-xs text-gray-400">{label(card.cost_category)}</p>
                    </td>
                    <td data-label="Season" className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(card.valid_from).toLocaleDateString('en-GB')} → {new Date(card.valid_to).toLocaleDateString('en-GB')}
                    </td>
                    <td data-label="Rates" className="px-4 py-3 text-gray-600">{card.supplier_rates?.[0]?.count ?? 0}</td>
                    <td data-label="Status" className="px-4 py-3"><span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (card.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>{card.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3 text-right"><Link href={`/admin/content/rates/${card.id}`} className="text-sm font-medium text-[var(--olive)] hover:underline">Edit</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ContentShell>
  )
}

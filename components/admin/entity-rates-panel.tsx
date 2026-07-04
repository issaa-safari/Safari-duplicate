import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Supplier rates attached to a content-library entity (accommodation, park, …).
 * Rate cards link to library rows via the polymorphic entity_type + entity_id
 * pair on supplier_rate_cards — the same key the Trip Builder resolves against.
 */
export default async function EntityRatesPanel({
  entityType,
  entityId,
  heading = 'Supplier Rates',
}: {
  entityType: string
  entityId: string
  heading?: string
}) {
  const admin = createAdminClient()
  const { data: cards } = await admin
    .from('supplier_rate_cards')
    .select('id, name, supplier_name, currency, valid_from, valid_to, is_active, supplier_rates(count)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('valid_from', { ascending: false })

  const newHref = `/admin/content/rates/new?entityType=${entityType}&entityId=${entityId}`

  return (
    <div className="p-6 pt-0 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{heading}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Used by the Trip Builder to price this item.</p>
          </div>
          <Link href={newHref}
            className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-[var(--olive-dk)] border border-[var(--olive)]/40 hover:bg-[var(--olive)]/5">
            + Add rate card
          </Link>
        </div>
        {!cards?.length ? (
          <p className="px-5 py-5 text-sm text-amber-700 bg-amber-50/60">
            No rates yet — quotes using this item can&apos;t be priced until a rate card covers the travel dates.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-2.5 font-semibold">Rate card</th>
                  <th className="px-3 py-2.5 font-semibold">Season</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Rates</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {cards.map((card: any) => (
                  <tr key={card.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-gray-900">{card.name}</p>
                      <p className="text-xs text-gray-400">{card.supplier_name || 'No supplier'} · {card.currency}</p>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                      {new Date(card.valid_from).toLocaleDateString('en-GB')} → {new Date(card.valid_to).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-600">{card.supplier_rates?.[0]?.count ?? 0}</td>
                    <td className="px-3 py-2.5">
                      <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (card.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {card.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <Link href={`/admin/content/rates/${card.id}`} className="text-sm font-medium text-[var(--olive)] hover:underline">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

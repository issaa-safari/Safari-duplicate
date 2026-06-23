import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'

const MEAL_LABELS: Record<string, string> = { B: 'Breakfast', L: 'Lunch', D: 'Dinner' }
const CATEGORY_LABELS: Record<string, string> = {
  accommodation: 'Accommodation',
  activities: 'Activities',
  park_fees: 'Park Fees',
  transport: 'Transport',
  staff: 'Staff',
  meals: 'Meals',
  flights: 'Flights',
  other: 'Other',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function QuotePrintPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: delivery } = await admin
    .from('quote_deliveries')
    .select('id, quote_id, quote_version_id, revoked_at, expires_at')
    .eq('access_token', token)
    .single()

  if (!delivery || delivery.revoked_at) notFound()
  if (delivery.expires_at && new Date(delivery.expires_at) < new Date()) notFound()

  const [
    { data: version },
    { data: quote },
    { data: quoteDays },
    { data: priceLines },
    { data: settings },
  ] = await Promise.all([
    admin.from('quote_versions')
      .select('id, version_number, title, travel_start_date, travel_end_date, valid_until, total_selling_usd, sharing_price_per_person_usd, single_price_per_person_usd, client_snapshot')
      .eq('id', delivery.quote_version_id).single(),
    admin.from('quotes')
      .select('id, quote_number, mode, client_id')
      .eq('id', delivery.quote_id).single(),
    admin.from('quote_days')
      .select('id, day_number, day_date, title, description_en, client_notes, destination_snapshot, meals')
      .eq('quote_version_id', delivery.quote_version_id)
      .order('day_number'),
    admin.from('quote_price_lines')
      .select('id, description, cost_category, total_selling_usd, is_optional')
      .eq('quote_version_id', delivery.quote_version_id)
      .eq('is_client_visible', true)
      .order('sort_order'),
    admin.from('company_settings')
      .select('company_name, logo_url, email, phone, whatsapp, address')
      .limit(1).single(),
  ])

  if (!version || !quote) notFound()

  const { data: client } = await admin
    .from('clients')
    .select('first_name, last_name, email')
    .eq('id', quote.client_id)
    .single()

  const clientName = client ? `${client.first_name} ${client.last_name}`.trim() : 'Guest'
  const companyName = settings?.company_name ?? 'Safari Adventures'
  const totalSelling = Number(version.total_selling_usd ?? 0)
  const sharingPp = Number(version.sharing_price_per_person_usd ?? 0)
  const singlePp = Number(version.single_price_per_person_usd ?? 0)

  const includedLines = (priceLines ?? []).filter((l: any) => !l.is_optional)
  const optionalLines = (priceLines ?? []).filter((l: any) => l.is_optional)

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { margin: 1.5cm 2cm; size: A4; }
        }
        body { font-family: Georgia, 'Times New Roman', serif; }
      `}</style>

      {/* Print button — hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="rounded-md px-4 py-2 text-sm font-medium text-white shadow-lg"
          style={{ backgroundColor: '#7A9A4A' }}
        >
          Print / Save PDF
        </button>
        <button
          onClick={() => window.history.back()}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 shadow-sm"
        >
          ← Back
        </button>
      </div>

      <div className="max-w-[780px] mx-auto p-8 text-gray-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 pb-6 mb-6" style={{ borderColor: '#7A9A4A' }}>
          <div>
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={companyName} className="h-12 w-auto mb-2" />
            ) : (
              <div className="h-12 w-12 rounded-full flex items-center justify-center text-white text-xl font-bold mb-2"
                style={{ backgroundColor: '#7A9A4A' }}>
                {companyName[0]}
              </div>
            )}
            <p className="text-xl font-bold text-gray-900">{companyName}</p>
            {settings?.address && <p className="text-sm text-gray-500 mt-0.5">{settings.address}</p>}
            {settings?.email && <p className="text-sm text-gray-500">{settings.email}</p>}
            {settings?.phone && <p className="text-sm text-gray-500">{settings.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: '#7A9A4A' }}>QUOTATION</p>
            <p className="text-sm font-mono text-gray-500 mt-1">{quote.quote_number}</p>
            <p className="text-sm text-gray-500 mt-3">Prepared for:</p>
            <p className="font-semibold text-gray-900">{clientName}</p>
            {client?.email && <p className="text-sm text-gray-500">{client.email}</p>}
          </div>
        </div>

        {/* Trip overview */}
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#f8faf4', border: '1px solid #d4e5b8' }}>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {version.title || 'Safari Quotation'}
          </h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Travel dates: </span>
              <span className="font-medium">
                {fmtDate(version.travel_start_date)}
                {version.travel_end_date && version.travel_end_date !== version.travel_start_date
                  ? ` – ${fmtDate(version.travel_end_date)}`
                  : ''}
              </span>
            </div>
            {version.valid_until && (
              <div>
                <span className="text-gray-500">Valid until: </span>
                <span className="font-medium">{fmtDate(version.valid_until)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Itinerary */}
        {quoteDays && quoteDays.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#7A9A4A' }}>
              Itinerary
            </h2>
            <div className="space-y-4">
              {quoteDays.map((day: any) => {
                const meals: string[] = day.meals ?? []
                const dest = day.destination_snapshot as Record<string, string> | null
                return (
                  <div key={day.id} className="border-l-2 pl-4" style={{ borderColor: '#d4e5b8' }}>
                    <p className="text-xs text-gray-400 font-medium">
                      Day {day.day_number}
                      {day.day_date ? ` · ${fmtDate(day.day_date)}` : ''}
                      {dest?.name ? ` · ${dest.name}` : ''}
                      {meals.length > 0 && ` · ${meals.map((m: string) => MEAL_LABELS[m] ?? m).join(', ')}`}
                    </p>
                    <h3 className="font-semibold text-gray-900 mb-1">{day.title || `Day ${day.day_number}`}</h3>
                    {day.description_en && (
                      <p className="text-sm text-gray-600 leading-relaxed">{day.description_en}</p>
                    )}
                    {day.client_notes && (
                      <p className="text-sm mt-1 italic text-gray-500">{day.client_notes}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* What's included */}
        {includedLines.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#7A9A4A' }}>
              What&apos;s Included
            </h2>
            <ul className="space-y-1.5">
              {includedLines.map((line: any) => (
                <li key={line.id} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 shrink-0" style={{ color: '#7A9A4A' }}>✓</span>
                  <span>
                    <span className="text-gray-800">{line.description}</span>
                    <span className="text-gray-400 text-xs ml-1">({CATEGORY_LABELS[line.cost_category] ?? line.cost_category})</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Optional add-ons */}
        {optionalLines.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#7A9A4A' }}>
              Optional Add-ons
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {optionalLines.map((line: any) => (
                  <tr key={line.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-800">{line.description}</td>
                    <td className="py-2 text-gray-400 text-xs">{CATEGORY_LABELS[line.cost_category] ?? line.cost_category}</td>
                    <td className="py-2 text-right font-medium text-gray-900">${fmt(Number(line.total_selling_usd))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pricing */}
        {totalSelling > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: '#7A9A4A' }}>
              Pricing
            </h2>
            <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#d4e5b8' }}>
              {sharingPp > 0 && (
                <div className="flex justify-between px-4 py-2.5 border-b text-sm" style={{ borderColor: '#d4e5b8' }}>
                  <span className="text-gray-600">Per person (sharing)</span>
                  <span className="font-semibold">${fmt(sharingPp)} USD</span>
                </div>
              )}
              {singlePp > 0 && (
                <div className="flex justify-between px-4 py-2.5 border-b text-sm" style={{ borderColor: '#d4e5b8' }}>
                  <span className="text-gray-600">Per person (single room)</span>
                  <span className="font-semibold">${fmt(singlePp)} USD</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-3 text-base font-bold" style={{ backgroundColor: '#f8faf4' }}>
                <span>Total</span>
                <span>${fmt(totalSelling)} USD</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200 text-xs text-gray-400 text-center space-y-1">
          <p>This quotation is valid until {fmtDate(version.valid_until)} and subject to availability at time of confirmation.</p>
          <p>Prices quoted in USD. Payment terms and booking conditions available on request.</p>
          {(settings?.email || settings?.phone || settings?.whatsapp) && (
            <p>
              Contact us: {[settings.email, settings.phone, settings.whatsapp && `WhatsApp: ${settings.whatsapp}`].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

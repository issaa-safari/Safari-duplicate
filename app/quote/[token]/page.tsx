import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import AcceptForm from './accept-form'

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

export default async function QuotePortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  // Look up delivery by token
  const { data: delivery } = await admin
    .from('quote_deliveries')
    .select('id, quote_id, quote_version_id, revoked_at, expires_at, view_count, first_viewed_at')
    .eq('access_token', token)
    .single()

  if (!delivery) notFound()
  if (delivery.revoked_at) notFound()
  if (delivery.expires_at && new Date(delivery.expires_at) < new Date()) notFound()

  // Track the view
  const now = new Date().toISOString()
  await admin.from('quote_deliveries').update({
    view_count: delivery.view_count + 1,
    last_viewed_at: now,
    first_viewed_at: delivery.first_viewed_at ?? now,
  }).eq('id', delivery.id)

  // Load quote version + quote details in parallel
  const [
    { data: version },
    { data: quote },
    { data: quoteDays },
    { data: priceLines },
    { data: acceptance },
    { data: settings },
  ] = await Promise.all([
    admin.from('quote_versions')
      .select('id, version_number, status, title, travel_start_date, travel_end_date, valid_until, total_selling_usd, sharing_price_per_person_usd, single_price_per_person_usd, client_snapshot')
      .eq('id', delivery.quote_version_id)
      .single(),
    admin.from('quotes')
      .select('id, quote_number, mode, client_id')
      .eq('id', delivery.quote_id)
      .single(),
    admin.from('quote_days')
      .select('id, day_number, day_date, title, description_en, client_notes, destination_snapshot, meals')
      .eq('quote_version_id', delivery.quote_version_id)
      .order('day_number'),
    admin.from('quote_price_lines')
      .select('id, description, cost_category, pricing_unit, quantity, total_selling_usd, is_optional')
      .eq('quote_version_id', delivery.quote_version_id)
      .eq('is_client_visible', true)
      .order('sort_order'),
    admin.from('quote_acceptances')
      .select('id, client_name, accepted_at')
      .eq('quote_version_id', delivery.quote_version_id)
      .maybeSingle(),
    admin.from('company_settings')
      .select('company_name, logo_url, email, phone, whatsapp')
      .limit(1).single(),
  ])

  if (!version || !quote) notFound()

  // Mark as viewed if currently sent
  if (version.status === 'sent') {
    await admin.from('quote_versions').update({ status: 'viewed' }).eq('id', version.id)
  }

  const { data: client } = await admin
    .from('clients')
    .select('first_name, last_name, email')
    .eq('id', quote.client_id)
    .single()

  const clientName = client ? `${client.first_name} ${client.last_name}`.trim() : 'Guest'
  const isAccepted = !!acceptance
  const isDeclined = version.status === 'declined'
  const isExpired = version.status === 'expired'
  const canAccept = !isAccepted && !isDeclined && !isExpired && ['sent', 'viewed', 'ready'].includes(version.status)

  const totalSelling = Number(version.total_selling_usd ?? 0)
  const sharingPp = Number(version.sharing_price_per_person_usd ?? 0)
  const singlePp = Number(version.single_price_per_person_usd ?? 0)

  const companyName = settings?.company_name ?? 'Safari Adventures'

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={companyName} className="h-8 w-auto" />
            ) : (
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: '#7A9A4A' }}>
                {companyName[0]}
              </div>
            )}
            <span className="font-semibold text-gray-900 text-sm">{companyName}</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/quote/${token}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-500 hover:border-[#7A9A4A] hover:text-[#4C5E2A] transition"
            >
              Download PDF
            </a>
            <span className="font-mono text-xs text-gray-400">{quote.quote_number}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-1">Hello, {clientName}</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {version.title || 'Your Safari Quote'}
          </h1>
          <p className="text-sm text-gray-500">
            {fmtDate(version.travel_start_date)}
            {version.travel_end_date && version.travel_end_date !== version.travel_start_date
              ? ` – ${fmtDate(version.travel_end_date)}`
              : ''}
          </p>
          {version.valid_until && (
            <p className="text-xs text-amber-600 mt-2">
              Quote valid until {fmtDate(version.valid_until)}
            </p>
          )}

          {isAccepted && (
            <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <p className="text-sm font-semibold text-green-800">Quote accepted</p>
              <p className="text-xs text-green-600 mt-0.5">
                Accepted by {acceptance.client_name} on {fmtDate(acceptance.accepted_at)}.
                Our team will be in touch shortly.
              </p>
            </div>
          )}
          {isDeclined && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm font-semibold text-red-800">Quote declined</p>
            </div>
          )}
        </div>

        {/* Itinerary */}
        {quoteDays && quoteDays.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Itinerary</h2>
            <div className="space-y-3">
              {quoteDays.map((day: any) => {
                const meals: string[] = day.meals ?? []
                const dest = day.destination_snapshot as Record<string, string> | null
                return (
                  <div key={day.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-0.5">
                          Day {day.day_number}
                          {day.day_date ? ` · ${fmtDate(day.day_date)}` : ''}
                          {dest?.name ? ` · ${dest.name}` : ''}
                        </p>
                        <h3 className="text-base font-semibold text-gray-900">{day.title || `Day ${day.day_number}`}</h3>
                      </div>
                      {meals.length > 0 && (
                        <div className="flex gap-1 shrink-0">
                          {meals.map((m: string) => (
                            <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                              {MEAL_LABELS[m] ?? m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {day.description_en && (
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{day.description_en}</p>
                    )}
                    {day.client_notes && (
                      <p className="text-sm text-[#4C5E2A] mt-2 bg-[#7A9A4A]/5 rounded-lg px-3 py-2">{day.client_notes}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* What's included */}
        {priceLines && priceLines.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">What&apos;s Included</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {priceLines.filter((l: any) => !l.is_optional).map((line: any) => (
                <div key={line.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-900">{line.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {CATEGORY_LABELS[line.cost_category] ?? line.cost_category}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {priceLines.some((l: any) => l.is_optional) && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Optional Add-ons</p>
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
                  {priceLines.filter((l: any) => l.is_optional).map((line: any) => (
                    <div key={line.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-900">{line.description}</p>
                        <p className="text-xs text-gray-400">{CATEGORY_LABELS[line.cost_category] ?? line.cost_category}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 shrink-0">
                        ${fmt(Number(line.total_selling_usd))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Price summary */}
        {totalSelling > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Pricing</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              {sharingPp > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Per person (sharing)</span>
                  <span className="font-semibold text-gray-900">${fmt(sharingPp)}</span>
                </div>
              )}
              {singlePp > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Per person (single room)</span>
                  <span className="font-semibold text-gray-900">${fmt(singlePp)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold border-t border-gray-100 pt-3">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">${fmt(totalSelling)} USD</span>
              </div>
            </div>
          </section>
        )}

        {/* Accept */}
        {canAccept && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Accept this Quote</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-5">
                Ready to proceed? Confirm your name below and accept the quote to begin the booking process.
                Our team will contact you within 24 hours to confirm details and arrange payment.
              </p>
              <AcceptForm
                deliveryId={delivery.id}
                versionId={version.id}
                quoteId={quote.id}
                clientName={clientName}
              />
            </div>
          </section>
        )}

        {/* Contact */}
        {(settings?.email || settings?.whatsapp || settings?.phone) && (
          <div className="text-center text-sm text-gray-500 pb-6">
            <p className="mb-1">Questions? Contact us:</p>
            {settings.email && <span className="mx-2">{settings.email}</span>}
            {settings.whatsapp && <span className="mx-2">WhatsApp: {settings.whatsapp}</span>}
            {settings.phone && <span className="mx-2">{settings.phone}</span>}
          </div>
        )}
      </main>
    </div>
  )
}

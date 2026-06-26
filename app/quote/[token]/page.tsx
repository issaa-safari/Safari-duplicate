import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import AcceptForm from './accept-form'

const MEAL_LABELS: Record<string, string> = { B: 'Breakfast', L: 'Lunch', D: 'Dinner' }
const MEAL_LABELS_AR: Record<string, string> = { B: 'إفطار', L: 'غداء', D: 'عشاء' }

const AR = {
  hello:        'مرحباً،',
  itinerary:    'برنامج الرحلة',
  day:          'يوم',
  included:     'ما يشمله السعر',
  optional:     'إضافات اختيارية',
  pricing:      'التسعير',
  sharingPp:    'للشخص (مشاركة)',
  singlePp:     'للشخص (غرفة منفردة)',
  total:        'الإجمالي',
  accept:       'قبول هذا العرض',
  acceptBody:   'هل أنت مستعد للمتابعة؟ أدخل اسمك أدناه لقبول العرض وبدء إجراءات الحجز. سيتواصل معك فريقنا خلال 24 ساعة لتأكيد التفاصيل وترتيب الدفع.',
  accepted:     'تم قبول العرض',
  acceptedBy:   'تم القبول من قِبل',
  on:           'بتاريخ',
  declined:     'تم رفض العرض',
  validUntil:   'العرض صالح حتى',
  contact:      'تواصل معنا',
}

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
      .select('id, version_number, status, title, language, travel_start_date, travel_end_date, valid_until, total_selling_usd, sharing_price_per_person_usd, single_price_per_person_usd, cost_base_usd, default_markup_percent, client_snapshot')
      .eq('id', delivery.quote_version_id)
      .single(),
    admin.from('quotes')
      .select('id, quote_number, mode, client_id, tour_id')
      .eq('id', delivery.quote_id)
      .single(),
    admin.from('quote_days')
      .select('id, day_number, day_date, title, description_en, client_notes, title_ar, description_ar, client_notes_ar, destination_snapshot, meals')
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

  const [
    { data: client },
    { data: quoteTravellers },
  ] = await Promise.all([
    admin.from('clients')
      .select('first_name, last_name, email')
      .eq('id', (quote as any).client_id)
      .single(),
    admin.from('quote_travellers')
      .select('id, traveller_category, age_band_snapshot, room_category, is_paying, is_complimentary')
      .eq('quote_version_id', delivery.quote_version_id)
      .order('sort_order'),
  ])

  const isArabic = (version as any)?.language === 'ar'
  const clientName = client ? `${client.first_name} ${client.last_name}`.trim() : 'Guest'
  const isAccepted = !!acceptance
  const isDeclined = version.status === 'declined'
  const isExpired = version.status === 'expired'
  const canAccept = !isAccepted && !isDeclined && !isExpired && ['sent', 'viewed', 'ready'].includes(version.status)

  const totalSelling = Number(version.total_selling_usd ?? 0)
  const sharingPp = Number(version.sharing_price_per_person_usd ?? 0)
  const singlePp = Number(version.single_price_per_person_usd ?? 0)
  const costBase = Number((version as any).cost_base_usd ?? 0)
  const markupPercent = Number((version as any).default_markup_percent ?? 0)
  const hasQuoteLevelPricing = costBase > 0

  const companyName = settings?.company_name ?? 'Safari Adventures'

  // Load tour hero image if needed
  const { data: tourData } = (quote as any)?.tour_id
    ? await admin.from('tours').select('image_url, hero_image_url').eq('id', (quote as any).tour_id).single()
    : { data: null as any }
  const heroImage = (tourData as any)?.image_url ?? (tourData as any)?.hero_image_url ?? null

  // Load accommodation and activity items by day
  const dayIds = (quoteDays ?? []).map((d: any) => d.id)
  const { data: dayItems } = dayIds.length
    ? await admin.from('quote_day_items')
        .select('quote_day_id, item_type, title_snapshot')
        .in('quote_day_id', dayIds)
        .in('item_type', ['accommodation', 'activity'])
        .order('sort_order')
    : { data: [] as any[] }

  const accomByDay: Record<string, string[]> = {}
  const actsByDay: Record<string, string[]> = {}
  for (const item of dayItems ?? []) {
    if (item.item_type === 'accommodation') {
      if (!accomByDay[item.quote_day_id]) accomByDay[item.quote_day_id] = []
      if (item.title_snapshot) accomByDay[item.quote_day_id].push(item.title_snapshot)
    } else if (item.item_type === 'activity') {
      if (!actsByDay[item.quote_day_id]) actsByDay[item.quote_day_id] = []
      if (item.title_snapshot) actsByDay[item.quote_day_id].push(item.title_snapshot)
    }
  }

  // Group travellers by age band for per-type breakdown
  type TGroup = { name: string; count: number; perPerson: number; total: number }
  const payingTravellers = (quoteTravellers ?? []).filter((t: any) => t.is_paying && !t.is_complimentary)

  // Derive per-person base if not explicitly stored
  let effectiveSharingPp = sharingPp
  const totalSellingDerived = costBase > 0
    ? (markupPercent > 0 ? costBase * (1 + markupPercent / 100) : costBase)
    : totalSelling
  if (effectiveSharingPp === 0 && totalSellingDerived > 0 && payingTravellers.length > 0) {
    const weightedSum = (payingTravellers as any[]).reduce((s: number, t: any) => {
      const pct = ((t.age_band_snapshot as any)?.default_percentage ?? 100) / 100
      return s + pct
    }, 0)
    effectiveSharingPp = weightedSum > 0
      ? totalSellingDerived / weightedSum
      : totalSellingDerived / payingTravellers.length
  }

  const tGroupMap: Record<string, TGroup> = {}
  for (const t of payingTravellers as any[]) {
    const band = t.age_band_snapshot as any
    const key = band?.code ?? t.traveller_category ?? 'adult'
    const bandName = band?.name ?? (t.traveller_category === 'adult' ? 'Adult' : 'Child')
    const bandPct = (band?.default_percentage ?? 100) / 100
    const pp = effectiveSharingPp > 0 ? effectiveSharingPp * bandPct : 0
    if (!tGroupMap[key]) tGroupMap[key] = { name: bandName, count: 0, perPerson: pp, total: 0 }
    tGroupMap[key].count++
    tGroupMap[key].total += pp
  }
  const travellerGroups = Object.values(tGroupMap)
  const grandTotal = travellerGroups.reduce((s, g) => s + g.total, 0) || totalSellingDerived

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

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
        {/* Hero with title + thumbnail */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-2">{isArabic ? AR.hello : 'Hello,'} {clientName}</p>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {version.title || (isArabic ? 'عرض سعر رحلتك' : 'Your Safari Quote')}
              </h1>
              <p className="text-sm text-gray-600">
                {fmtDate(version.travel_start_date)}
                {version.travel_end_date && version.travel_end_date !== version.travel_start_date
                  ? ` – ${fmtDate(version.travel_end_date)}`
                  : ''}
              </p>
            </div>
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage} alt={version.title} className="w-24 h-16 object-cover rounded-lg flex-shrink-0" />
            ) : (
              <div className="w-24 h-16 rounded-lg flex-shrink-0 bg-gradient-to-br from-green-900 via-[#7A9A4A] to-green-100 flex items-center justify-center text-white text-2xl">
                🦁
              </div>
            )}
          </div>

          {version.valid_until && (
            <p className="text-xs text-amber-600 mt-3">
              {isArabic ? AR.validUntil : 'Quote valid until'} {fmtDate(version.valid_until)}
            </p>
          )}

          {isAccepted && (
            <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
              <p className="text-sm font-semibold text-green-800">{isArabic ? AR.accepted : 'Quote accepted'}</p>
              <p className="text-xs text-green-600 mt-0.5">
                {isArabic ? AR.acceptedBy : 'Accepted by'} {acceptance.client_name} {isArabic ? AR.on : 'on'} {fmtDate(acceptance.accepted_at)}.
              </p>
            </div>
          )}
          {isDeclined && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm font-semibold text-red-800">{isArabic ? AR.declined : 'Quote declined'}</p>
            </div>
          )}
        </div>

        {/* Summary Table */}
        {quoteDays && quoteDays.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {isArabic ? 'يوم بيوم' : 'Day by Day'}
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200" style={{ backgroundColor: '#7A9A4A' }}>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide" style={{ width: '16%' }}>
                      {isArabic ? 'اليوم' : 'Days'}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide" style={{ width: '22%' }}>
                      {isArabic ? 'الوجهة التالية' : 'Next Destination'}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide" style={{ width: '36%' }}>
                      {isArabic ? 'الإقامة' : 'Accommodation'}
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-wide" style={{ width: '26%' }}>
                      {isArabic ? 'خطة الوجبات' : 'Meal Plan'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {quoteDays.map((day: any, i: number) => {
                    const dest = (day.destination_snapshot as any)?.name ?? '—'
                    const accoms = accomByDay[day.id] ?? []
                    const dayMeals: string[] = day.meals ?? []
                    const mealLabels = isArabic ? MEAL_LABELS_AR : MEAL_LABELS
                    const mealStr = dayMeals.map((m: string) => mealLabels[m] ?? m).join(', ') || '—'
                    const dayLabel = day.day_number_end && day.day_number_end !== day.day_number
                      ? `${isArabic ? AR.day : 'Day'} ${day.day_number}–${day.day_number_end}`
                      : `${isArabic ? AR.day : 'Day'} ${day.day_number}`
                    return (
                      <tr key={day.id} style={{ backgroundColor: i % 2 === 0 ? '#fafff5' : '#fff' }}>
                        <td className="px-4 py-3 font-medium text-gray-900">{dayLabel}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{dest}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {accoms.length > 0 ? accoms[0] : <span className="text-gray-400 text-xs italic">{isArabic ? 'بدون إقامة' : 'No accommodation'}</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-xs">{mealStr}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Itinerary */}
        {quoteDays && quoteDays.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {isArabic ? AR.itinerary : 'Itinerary'}
            </h2>
            <div className="space-y-3">
              {quoteDays.map((day: any) => {
                const meals: string[] = day.meals ?? []
                const dest = day.destination_snapshot as Record<string, string> | null
                const mealLabels = isArabic ? MEAL_LABELS_AR : MEAL_LABELS
                const dayTitle = isArabic && day.title_ar ? day.title_ar : (day.title || `${isArabic ? AR.day : 'Day'} ${day.day_number}`)
                const dayDesc = isArabic && day.description_ar ? day.description_ar : day.description_en
                const dayNotes = isArabic && day.client_notes_ar ? day.client_notes_ar : day.client_notes
                return (
                  <div key={day.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-gray-400 font-medium mb-0.5">
                          {isArabic ? AR.day : 'Day'} {day.day_number}
                          {day.day_date ? ` · ${fmtDate(day.day_date)}` : ''}
                          {dest?.name ? ` · ${dest.name}` : ''}
                        </p>
                        <h3 className="text-base font-semibold text-gray-900">{dayTitle}</h3>
                      </div>
                      {meals.length > 0 && (
                        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                          {meals.map((m: string) => (
                            <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                              {mealLabels[m] ?? m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {dayDesc && (
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">{dayDesc}</p>
                    )}
                    {dayNotes && (
                      <p className="text-sm text-[#4C5E2A] mt-2 bg-[#7A9A4A]/5 rounded-lg px-3 py-2">{dayNotes}</p>
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
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {isArabic ? AR.included : "What's Included"}
            </h2>
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
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {isArabic ? AR.optional : 'Optional Add-ons'}
                </p>
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

        {/* Pricing Section */}
        {(hasQuoteLevelPricing || grandTotal > 0) && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {isArabic ? AR.pricing : 'Pricing'}
            </h2>

            {/* Traveller-type breakdown (connected to cost base) */}
            {travellerGroups.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-3 px-5 py-3 border-b border-gray-200" style={{ backgroundColor: '#7A9A4A' }}>
                  <span className="text-xs font-semibold text-white uppercase tracking-wide">
                    {isArabic ? 'المسافر' : 'Traveller'}
                  </span>
                  <span className="text-xs font-semibold text-white uppercase tracking-wide text-right">
                    {isArabic ? 'للشخص' : 'Per Person'}
                  </span>
                  <span className="text-xs font-semibold text-white uppercase tracking-wide text-right">
                    {isArabic ? 'الإجمالي' : 'Total'}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {travellerGroups.map((g, i) => (
                    <div key={i} className="grid grid-cols-3 items-center px-5 py-3 text-sm" style={{ backgroundColor: i % 2 === 0 ? '#fafff5' : '#fff' }}>
                      <span className="text-gray-800 font-medium">{g.count}x {g.name}</span>
                      <span className="text-gray-700 text-right">
                        {g.perPerson > 0 ? `$${fmt(g.perPerson)}` : '—'}
                      </span>
                      <span className="font-semibold text-gray-900 text-right">
                        {g.total > 0 ? `$${fmt(g.total)}` : '—'}
                      </span>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 items-center px-5 py-3 font-bold text-base" style={{ backgroundColor: '#f8fdf0', borderTop: '2px solid #7A9A4A' }}>
                    <span className="text-gray-900">
                      {isArabic ? AR.total : 'Total in USD'}
                    </span>
                    <span />
                    <span className="text-gray-900 text-right">${fmt(grandTotal)} USD</span>
                  </div>
                </div>
              </div>
            ) : grandTotal > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex justify-between items-center text-base font-bold">
                  <span className="text-gray-900">{isArabic ? AR.total : 'Total in USD'}</span>
                  <span className="text-gray-900">${fmt(grandTotal)} USD</span>
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* Accept */}
        {canAccept && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {isArabic ? AR.accept : 'Accept this Quote'}
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-5">
                {isArabic ? AR.acceptBody : 'Ready to proceed? Confirm your name below and accept the quote to begin the booking process. Our team will contact you within 24 hours to confirm details and arrange payment.'}
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
            <p className="mb-1">{isArabic ? AR.contact : 'Questions? Contact us:'}</p>
            {settings.email && <span className="mx-2">{settings.email}</span>}
            {settings.whatsapp && <span className="mx-2">WhatsApp: {settings.whatsapp}</span>}
            {settings.phone && <span className="mx-2">{settings.phone}</span>}
          </div>
        )}
      </main>
    </div>
  )
}

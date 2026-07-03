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
      .select('id, version_number, status, title, language, travel_start_date, travel_end_date, valid_until, total_selling_usd, sharing_price_per_person_usd, single_price_per_person_usd, cost_base_usd, default_markup_percent, client_snapshot, track_label, compare_group')
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
      .select('id, client_name, accepted_at, quote_version_id')
      .eq('quote_id', delivery.quote_id)
      .order('accepted_at', { ascending: false })
      .limit(1)
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

  // Dual-track proposal: a sibling version sharing this compare_group carries
  // the other package (Standard vs Premium). Same transport/parks — only the
  // accommodation differs — so the client picks one price.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let sibling: any = null
  let siblingHotels: string[] = []
  let versionHotels: string[] = []
  if ((version as any).compare_group) {
    const { data: siblings } = await admin
      .from('quote_versions')
      .select('id, status, track_label, total_selling_usd, sharing_price_per_person_usd, version_number')
      .eq('quote_id', delivery.quote_id)
      .eq('compare_group', (version as any).compare_group)
      .neq('id', version.id)
      .not('track_label', 'is', null)
      .in('status', ['draft', 'ready', 'sent', 'viewed', 'accepted'])
      .order('version_number', { ascending: false })
    sibling = (siblings ?? []).find((s: any) => s.track_label !== (version as any).track_label) ?? null
    if (sibling) {
      const [{ data: ownHotelLines }, { data: sibHotelLines }] = await Promise.all([
        admin.from('quote_price_lines')
          .select('description')
          .eq('quote_version_id', version.id)
          .eq('cost_category', 'accommodation')
          .eq('is_client_visible', true)
          .order('sort_order'),
        admin.from('quote_price_lines')
          .select('description')
          .eq('quote_version_id', sibling.id)
          .eq('cost_category', 'accommodation')
          .eq('is_client_visible', true)
          .order('sort_order'),
      ])
      versionHotels = (ownHotelLines ?? []).map((l: any) => l.description as string)
      siblingHotels = (sibHotelLines ?? []).map((l: any) => l.description as string)
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

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

  const trackTitle = (t: string | null) => (t === 'premium' ? 'Premium' : t === 'standard' ? 'Standard' : null)
  const acceptedTrackLabel = acceptance
    ? (acceptance as { quote_version_id?: string }).quote_version_id === version.id
      ? trackTitle((version as any).track_label)
      : sibling && (acceptance as { quote_version_id?: string }).quote_version_id === sibling.id
        ? trackTitle(sibling.track_label)
        : null
    : null

  const totalSelling = Number(version.total_selling_usd ?? 0)
  const sharingPp = Number(version.sharing_price_per_person_usd ?? 0)
  const singlePp = Number(version.single_price_per_person_usd ?? 0)
  const costBase = Number((version as any).cost_base_usd ?? 0)
  const markupPercent = Number((version as any).default_markup_percent ?? 0)
  const hasQuoteLevelPricing = costBase > 0

  const companyName = settings?.company_name ?? 'Safari Adventures'

  // Load tour hero image if needed
  const { data: tourData } = (quote as any)?.tour_id
    ? await admin.from('tours').select('hero_image_url').eq('id', (quote as any).tour_id).maybeSingle()
    : { data: null as any }
  const heroImage = (tourData as any)?.hero_image_url ?? null

  // Day descriptions are pulled from the selected destination in the Content library.
  const destIds = [...new Set((quoteDays ?? []).map((d: any) => (d.destination_snapshot as any)?.id).filter(Boolean))]
  const destDescMap: Record<string, { en: string | null; ar: string | null }> = {}
  if (destIds.length > 0) {
    const { data: dests } = await admin
      .from('destinations')
      .select('id, description_en, description_ar')
      .in('id', destIds)
    for (const d of dests ?? []) destDescMap[d.id] = { en: d.description_en, ar: d.description_ar }
  }

  // Load accommodation and activity items by day
  const dayIds = (quoteDays ?? []).map((d: any) => d.id)
  const { data: dayItems } = dayIds.length
    ? await admin.from('quote_day_items')
        .select('quote_day_id, item_type, activity_id, title_snapshot, content_snapshot')
        .in('quote_day_id', dayIds)
        .in('item_type', ['accommodation', 'activity'])
        .order('sort_order')
    : { data: [] as any[] }

  type ActItem = { name: string; activity_id: string | null; moment: string; optional: boolean }
  const accomByDay: Record<string, string[]> = {}
  const actsByDay: Record<string, ActItem[]> = {}
  for (const item of dayItems ?? []) {
    if (item.item_type === 'accommodation') {
      if (!accomByDay[item.quote_day_id]) accomByDay[item.quote_day_id] = []
      if (item.title_snapshot) accomByDay[item.quote_day_id].push(item.title_snapshot)
    } else if (item.item_type === 'activity') {
      if (!actsByDay[item.quote_day_id]) actsByDay[item.quote_day_id] = []
      const cs = (item.content_snapshot ?? {}) as any
      actsByDay[item.quote_day_id].push({
        name: item.title_snapshot, activity_id: item.activity_id ?? null,
        moment: cs.moment ?? '', optional: !!cs.optional,
      })
    }
  }

  // Activity descriptions (EN/AR) pulled live from the Content library.
  const actIds = [...new Set(Object.values(actsByDay).flat().map(a => a.activity_id).filter(Boolean))] as string[]
  const actDescMap: Record<string, { en: string | null; ar: string | null }> = {}
  if (actIds.length > 0) {
    const { data: acts } = await admin.from('activities').select('id, description_en, description_ar').in('id', actIds)
    for (const a of acts ?? []) actDescMap[a.id] = { en: a.description_en, ar: a.description_ar }
  }
  const momentLbl = (m: string) => (isArabic
    ? ({ morning: 'صباحاً', afternoon: 'بعد الظهر', evening: 'مساءً', night: 'ليلاً' } as Record<string, string>)[m]
    : ({ morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' } as Record<string, string>)[m]) ?? m

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
              <p className="text-sm font-semibold text-green-800">
                {isArabic ? AR.accepted : 'Quote accepted'}
                {acceptedTrackLabel ? ` — ${acceptedTrackLabel} package` : ''}
              </p>
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

        {/* Cover letter intro */}
        <div className="bg-gray-900 text-gray-200 rounded-xl p-6">
          <p className="font-semibold text-white mb-3">
            {isArabic ? `عزيزي/عزيزتي ${client?.first_name ?? clientName}،` : `Dear ${client?.first_name ?? clientName},`}
          </p>
          <p className="text-sm leading-relaxed mb-3">
            {isArabic ? 'شكراً على اهتمامكم.' : 'Thank you for your inquiry.'}
          </p>
          <p className="text-sm leading-relaxed mb-3">
            {isArabic
              ? `يسعدنا تقديم هذا العرض المخصص لرحلة "${version.title || 'السفاري'}" بناءً على طلبكم.`
              : `It is our pleasure to send you this custom-made quote for ${version.title || 'your safari'} as per your request.`}
          </p>
          <p className="text-sm leading-relaxed mb-4">
            {isArabic
              ? 'لا تترددوا في التواصل معنا لأي استفسار. نتطلع لمساعدتكم في تخطيط رحلة العمر.'
              : 'Please do not hesitate to contact us with any questions. We look forward to helping you plan your safari trip of a lifetime.'}
          </p>
          <div className="border-t border-gray-700 pt-3 text-sm">
            <p className="text-gray-400">{isArabic ? 'مع خالص التحية' : 'Best regards'}</p>
            <p className="font-semibold text-white">{companyName}</p>
          </div>
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
                const dd = dest?.id ? destDescMap[dest.id] : null
                const dayDesc = dd ? (isArabic ? (dd.ar || dd.en) : dd.en) : null
                const dayNotes = isArabic && day.client_notes_ar ? day.client_notes_ar : day.client_notes
                const dayActs = actsByDay[day.id] ?? []
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
                    {dayActs.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {dayActs.map((a, ai) => {
                          const adm = a.activity_id ? actDescMap[a.activity_id] : null
                          const adesc = adm ? (isArabic ? (adm.ar || adm.en) : adm.en) : null
                          return (
                            <div key={ai} className="flex items-start gap-2">
                              <span style={{ color: '#7A9A4A' }}>→</span>
                              <div>
                                <p className="text-sm font-medium text-gray-800">
                                  {a.name}
                                  {a.moment && <span className="text-xs text-gray-400 font-normal"> · {momentLbl(a.moment)}</span>}
                                  {a.optional && <span className="text-xs text-amber-600 font-normal"> · {isArabic ? 'اختياري' : 'optional'}</span>}
                                </p>
                                {adesc && <p className="text-sm text-gray-600">{adesc}</p>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
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

        {/* What's excluded (static) */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {isArabic ? 'ما لا يشمله السعر' : "What's Excluded"}
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              {isArabic
                ? 'المواد الشخصية (الهدايا التذكارية، تأمين السفر، رسوم التأشيرة، الإنترنت، المشروبات الخاصة). الإقامة الإضافية قبل وبعد الرحلة. الإكراميات (إرشادياً 50 دولار للشخص يومياً). الرحلات الجوية الدولية.'
                : 'Personal items (souvenirs, travel insurance, visa fees, internet, unusual beverages). Additional accommodation before and after the tour. Tips & gratuities (guideline $50.00 per person per day). International flights.'}
            </p>
          </div>
        </section>

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

        {/* Dual-track package comparison */}
        {sibling && (() => {
          const payingCount = payingTravellers.length
          const cards = [
            {
              id: version.id as string,
              label: trackTitle((version as any).track_label) ?? 'Option A',
              total: totalSelling,
              perPerson: Number(version.sharing_price_per_person_usd ?? 0)
                || (payingCount > 0 ? totalSelling / payingCount : 0),
              hotels: versionHotels,
            },
            {
              id: sibling.id as string,
              label: trackTitle(sibling.track_label) ?? 'Option B',
              total: Number(sibling.total_selling_usd ?? 0),
              perPerson: Number(sibling.sharing_price_per_person_usd ?? 0)
                || (payingCount > 0 ? Number(sibling.total_selling_usd ?? 0) / payingCount : 0),
              hotels: siblingHotels,
            },
          ].sort(a => (a.label === 'Standard' ? -1 : 1))
          return (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {isArabic ? 'اختر باقتك' : 'Choose Your Package'}
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                {isArabic
                  ? 'نفس البرنامج والمواصلات ورسوم المنتزهات — يختلف مستوى الإقامة فقط.'
                  : 'Both packages follow the same itinerary, transport and park entries — only the hotels differ.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cards.map(c => (
                  <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#7A9A4A' }}>
                      {c.label} {isArabic ? 'باقة' : 'package'}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      ${fmt(c.perPerson)}
                      <span className="text-sm font-normal text-gray-400"> {isArabic ? 'للشخص' : 'per person'}</span>
                    </p>
                    <p className="text-xs text-gray-400 mb-3">${fmt(c.total)} {isArabic ? 'إجمالي' : 'total'}</p>
                    {c.hotels.length > 0 && (
                      <ul className="text-sm text-gray-600 space-y-1 mt-auto">
                        {c.hotels.map((h, i) => (
                          <li key={i} className="flex gap-2"><span style={{ color: '#7A9A4A' }}>◆</span>{h}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
        })()}

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
                tracks={sibling ? [
                  {
                    versionId: version.id as string,
                    label: trackTitle((version as any).track_label) ?? 'Option A',
                    totalUsd: totalSelling,
                  },
                  {
                    versionId: sibling.id as string,
                    label: trackTitle(sibling.track_label) ?? 'Option B',
                    totalUsd: Number(sibling.total_selling_usd ?? 0),
                  },
                ].sort(a => (a.label === 'Standard' ? -1 : 1)) : undefined}
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

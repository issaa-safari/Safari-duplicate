import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import AcceptForm from './accept-form'
import { syncQuoteStatus } from '@/lib/server/quote-status'
import ProposalView, { type ProposalDay, type SummaryRow, type TravellerGroup } from '@/components/quote/proposal-view'
import { site } from '@/lib/site'

const MEAL_LABELS: Record<string, string> = { B: 'Breakfast', L: 'Lunch', D: 'Dinner' }
const MEAL_LABELS_AR: Record<string, string> = { B: 'إفطار', L: 'غداء', D: 'عشاء' }

const INCLUDED_DEFAULT_EN = ['All activities (unless marked optional)', 'Meals as specified in the day-by-day', 'Taxes / VAT', 'Park fees', 'All accommodations', 'Professional guide', 'All transportation']
const INCLUDED_DEFAULT_AR = ['جميع الأنشطة (ما لم تُذكر كاختيارية)', 'الوجبات كما هو محدد في البرنامج اليومي', 'الضرائب / ضريبة القيمة المضافة', 'رسوم المتنزهات', 'جميع أماكن الإقامة', 'مرشد محترف', 'جميع وسائل النقل']
const EXCLUDED_EN = ['Personal items (souvenirs, travel insurance, visa fees)', 'Government-imposed increases of taxes / park fees', 'Additional accommodation before or after the tour', 'Tips & gratuities (guideline US$50 per person per day)', 'International flights']
const EXCLUDED_AR = ['المواد الشخصية (الهدايا، تأمين السفر، رسوم التأشيرة)', 'الزيادات الحكومية في الضرائب / رسوم المتنزهات', 'الإقامة الإضافية قبل أو بعد الرحلة', 'الإكراميات (إرشادياً 50 دولاراً للشخص يومياً)', 'الرحلات الجوية الدولية']

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

  const { data: delivery } = await admin
    .from('quote_deliveries')
    .select('id, quote_id, quote_version_id, revoked_at, expires_at, view_count, first_viewed_at')
    .eq('access_token', token)
    .single()

  if (!delivery) notFound()
  if (delivery.revoked_at) notFound()
  if (delivery.expires_at && new Date(delivery.expires_at) < new Date()) notFound()

  const now = new Date().toISOString()
  await admin.from('quote_deliveries').update({
    view_count: delivery.view_count + 1,
    last_viewed_at: now,
    first_viewed_at: delivery.first_viewed_at ?? now,
  }).eq('id', delivery.id)

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
      .select('id, day_number, day_number_end, day_date, title, description_en, client_notes, title_ar, description_ar, client_notes_ar, destination_snapshot, meals, photos')
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
      .select('company_name, logo_url, email, phone, whatsapp, website')
      .limit(1).single(),
  ])

  if (!version || !quote) notFound()

  if (version.status === 'sent') {
    await admin.from('quote_versions').update({ status: 'viewed' }).eq('id', version.id)
    await syncQuoteStatus(admin, delivery.quote_id)
  }

  const [
    { data: client },
    { data: quoteTravellers },
  ] = await Promise.all([
    admin.from('clients').select('first_name, last_name, email').eq('id', (quote as any).client_id).single(),
    admin.from('quote_travellers')
      .select('id, traveller_category, age_band_snapshot, room_category, is_paying, is_complimentary')
      .eq('quote_version_id', delivery.quote_version_id)
      .order('sort_order'),
  ])

  const isArabic = (version as any)?.language === 'ar'
  const mealLabels = isArabic ? MEAL_LABELS_AR : MEAL_LABELS
  const clientName = client ? `${client.first_name} ${client.last_name}`.trim() : 'Guest'
  const clientFirstName = client?.first_name ?? clientName
  const isAccepted = !!acceptance
  const isDeclined = version.status === 'declined'
  const isExpired = version.status === 'expired'
  const canAccept = !isAccepted && !isDeclined && !isExpired && ['sent', 'viewed', 'ready'].includes(version.status)

  const totalSelling = Number(version.total_selling_usd ?? 0)
  const sharingPp = Number(version.sharing_price_per_person_usd ?? 0)
  const costBase = Number((version as any).cost_base_usd ?? 0)
  const markupPercent = Number((version as any).default_markup_percent ?? 0)

  const companyName = settings?.company_name ?? 'Safari Adventures'

  const { data: tourData } = (quote as any)?.tour_id
    ? await admin.from('tours').select('hero_image_url').eq('id', (quote as any).tour_id).maybeSingle()
    : { data: null as any }
  const heroImage = (tourData as any)?.hero_image_url ?? null

  // Destination descriptions from the Content library.
  const destIds = [...new Set((quoteDays ?? []).map((d: any) => (d.destination_snapshot as any)?.id).filter(Boolean))]
  const destDescMap: Record<string, { en: string | null; ar: string | null }> = {}
  if (destIds.length > 0) {
    const { data: dests } = await admin.from('destinations').select('id, description_en, description_ar').in('id', destIds)
    for (const d of dests ?? []) destDescMap[d.id] = { en: d.description_en, ar: d.description_ar }
  }

  // Accommodation + activity items per day.
  const dayIds = (quoteDays ?? []).map((d: any) => d.id)
  const { data: dayItems } = dayIds.length
    ? await admin.from('quote_day_items')
        .select('quote_day_id, item_type, accommodation_id, activity_id, room_category, title_snapshot, content_snapshot')
        .in('quote_day_id', dayIds)
        .in('item_type', ['accommodation', 'activity'])
        .order('sort_order')
    : { data: [] as any[] }

  type ActItem = { name: string; activity_id: string | null; moment: string; optional: boolean; dayOffset: number }
  const accomItemByDay: Record<string, any> = {}
  const actsByDay: Record<string, ActItem[]> = {}
  for (const item of dayItems ?? []) {
    if (item.item_type === 'accommodation') {
      if (!accomItemByDay[item.quote_day_id] && item.title_snapshot) accomItemByDay[item.quote_day_id] = item
    } else if (item.item_type === 'activity') {
      if (!actsByDay[item.quote_day_id]) actsByDay[item.quote_day_id] = []
      const cs = (item.content_snapshot ?? {}) as any
      actsByDay[item.quote_day_id].push({
        name: item.title_snapshot, activity_id: item.activity_id ?? null,
        moment: cs.moment ?? '', optional: !!cs.optional,
        // Sub-day within a multi-night stop (0 = first day). Defaults to 0.
        dayOffset: Number(cs.day_offset ?? 0) || 0,
      })
    }
  }

  // Accommodation records (type, photo, description) for the day pages.
  const accIds = [...new Set(Object.values(accomItemByDay).map((i: any) => i.accommodation_id).filter(Boolean))] as string[]
  const accMap: Record<string, { type: string | null; cover: string | null; en: string | null; ar: string | null }> = {}
  if (accIds.length > 0) {
    const { data: accs } = await admin.from('accommodations').select('id, type, cover_image_url, description_en, description_ar').in('id', accIds)
    for (const a of accs ?? []) accMap[a.id] = { type: a.type, cover: a.cover_image_url, en: a.description_en, ar: a.description_ar }
  }

  // Activity descriptions.
  const actIds = [...new Set(Object.values(actsByDay).flat().map(a => a.activity_id).filter(Boolean))] as string[]
  const actDescMap: Record<string, { en: string | null; ar: string | null }> = {}
  if (actIds.length > 0) {
    const { data: acts } = await admin.from('activities').select('id, description_en, description_ar').in('id', actIds)
    for (const a of acts ?? []) actDescMap[a.id] = { en: a.description_en, ar: a.description_ar }
  }
  const momentLbl = (m: string) => (isArabic
    ? ({ morning: 'صباحاً', afternoon: 'بعد الظهر', evening: 'مساءً', night: 'ليلاً' } as Record<string, string>)[m]
    : ({ morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' } as Record<string, string>)[m]) ?? m

  // ── Traveller pricing (unchanged logic) ──
  type TG = { name: string; count: number; perPerson: number; total: number }
  const payingTravellers = (quoteTravellers ?? []).filter((t: any) => t.is_paying && !t.is_complimentary)
  const totalSellingDerived = totalSelling > 0
    ? totalSelling
    : costBase > 0 ? (markupPercent > 0 ? costBase * (1 + markupPercent / 100) : costBase) : 0
  let effectiveSharingPp = sharingPp
  if (effectiveSharingPp === 0 && totalSellingDerived > 0 && payingTravellers.length > 0) {
    const weightedSum = (payingTravellers as any[]).reduce((s: number, t: any) => s + (((t.age_band_snapshot as any)?.default_percentage ?? 100) / 100), 0)
    effectiveSharingPp = weightedSum > 0 ? totalSellingDerived / weightedSum : totalSellingDerived / payingTravellers.length
  }
  const tGroupMap: Record<string, TG> = {}
  for (const t of payingTravellers as any[]) {
    const band = t.age_band_snapshot as any
    const key = band?.code ?? t.traveller_category ?? 'adult'
    const bandName = band?.name ?? (t.traveller_category === 'adult' ? 'Adult' : 'Child')
    const bandPct = (band?.default_percentage ?? 100) / 100
    const pp = effectiveSharingPp > 0 ? effectiveSharingPp * bandPct : 0
    if (!tGroupMap[key]) tGroupMap[key] = { name: bandName, count: 0, perPerson: Math.round(pp), total: 0 }
    tGroupMap[key].count++
    tGroupMap[key].total += Math.round(pp)
  }
  const travellerGroups: TravellerGroup[] = Object.values(tGroupMap)
  const grandTotal = travellerGroups.reduce((s, g) => s + g.total, 0) || Math.round(totalSellingDerived)

  // ── Header facts ──
  const lastDay = Math.max(0, ...(quoteDays ?? []).map((d: any) => d.day_number_end || d.day_number))
  const days = lastDay || (quoteDays?.length ?? 0)
  const nights = Math.max(days - 1, 0)

  const travCounts: Record<string, number> = {}
  for (const t of (quoteTravellers ?? []) as any[]) {
    const cat = t.traveller_category === 'child' ? 'child' : 'adult'
    travCounts[cat] = (travCounts[cat] ?? 0) + 1
  }
  const travellersLabel = Object.entries(travCounts).map(([cat, n]) =>
    isArabic
      ? `${n} ${cat === 'child' ? (n > 1 ? 'أطفال' : 'طفل') : (n > 1 ? 'بالغين' : 'بالغ')}`
      : `${n} ${cat === 'child' ? (n > 1 ? 'Children' : 'Child') : (n > 1 ? 'Adults' : 'Adult')}`
  ).join(isArabic ? ' و ' : ', ') || (isArabic ? '—' : '—')

  // ── Summary rows ──
  const dayLabel = (d: any) => (d.day_number_end && d.day_number_end !== d.day_number
    ? `${isArabic ? 'يوم' : 'Day'} ${d.day_number}–${d.day_number_end}`
    : `${isArabic ? 'يوم' : 'Day'} ${d.day_number}`)

  const summaryRows: SummaryRow[] = (quoteDays ?? []).map((d: any) => {
    const item = accomItemByDay[d.id]
    const acc = item?.accommodation_id ? accMap[item.accommodation_id] : null
    const meta = [acc?.type, item?.room_category].filter(Boolean).map((s: string) => s.replace(/_/g, ' ')).join(' · ') || null
    const meals: string[] = d.meals ?? []
    return {
      dayLabel: dayLabel(d),
      destination: (d.destination_snapshot as any)?.name ?? '—',
      accommodation: item?.title_snapshot ?? (isArabic ? 'بدون إقامة' : 'No accommodation'),
      accommodationMeta: meta,
      meals: meals.map((m) => mealLabels[m] ?? m).join(', ') || '—',
    }
  })

  // ── Itinerary days ──
  const itinerary: ProposalDay[] = (quoteDays ?? []).map((d: any) => {
    const dest = d.destination_snapshot as Record<string, string> | null
    const dd = dest?.id ? destDescMap[dest.id] : null
    const item = accomItemByDay[d.id]
    const acc = item?.accommodation_id ? accMap[item.accommodation_id] : null
    const photos: string[] = Array.isArray(d.photos) ? d.photos : []
    const accPhotos = acc?.cover ? [acc.cover] : []
    const acts = actsByDay[d.id] ?? []
    const mapAct = (a: ActItem) => {
      const am = a.activity_id ? actDescMap[a.activity_id] : null
      return { name: a.name, moment: a.moment ? momentLbl(a.moment) : null, optional: a.optional, description: am ? (isArabic ? (am.ar || am.en) : am.en) : null }
    }
    // Multi-night stop → split activities into per-sub-day tabs.
    const span = d.day_number_end && d.day_number_end > d.day_number ? d.day_number_end - d.day_number + 1 : 1
    const activityGroups = span > 1
      ? Array.from({ length: span }, (_, i) => ({
          label: `${isArabic ? 'يوم' : 'Day'} ${d.day_number + i}`,
          activities: acts.filter((a) => a.dayOffset === i).map(mapAct),
        }))
      : undefined
    return {
      key: d.id,
      label: dayLabel(d),
      date: d.day_date ?? null,
      destination: dest?.name ?? null,
      title: (isArabic && d.title_ar ? d.title_ar : d.title) || dayLabel(d),
      description: dd ? (isArabic ? (dd.ar || dd.en) : dd.en) : (isArabic ? d.description_ar : d.description_en),
      heroPhoto: photos[0] ?? acc?.cover ?? null,
      activities: acts.map(mapAct),
      activityGroups,
      accommodation: item ? {
        name: item.title_snapshot,
        type: acc?.type ? acc.type.replace(/_/g, ' ') : null,
        room: item.room_category ? item.room_category.replace(/_/g, ' ') : null,
        description: acc ? (isArabic ? (acc.ar || acc.en) : acc.en) : null,
        photos: photos.length > 1 ? photos.slice(0, 2) : accPhotos,
      } : null,
      meals: (d.meals ?? []).map((m: string) => mealLabels[m] ?? m),
    }
  })

  // ── Included / optional ──
  const includedLines = (priceLines ?? []).filter((l: any) => !l.is_optional).map((l: any) => l.description)
  const included = includedLines.length > 0 ? includedLines : (isArabic ? INCLUDED_DEFAULT_AR : INCLUDED_DEFAULT_EN)
  const optional = (priceLines ?? []).filter((l: any) => l.is_optional).map((l: any) => ({
    description: l.description, price: `$${fmt(Number(l.total_selling_usd))}`,
  }))

  const acceptSlot = canAccept ? (
    <div>
      <p className="mb-4 text-sm text-gray-600">
        {isArabic
          ? 'هل أنت مستعد للمتابعة؟ أدخل اسمك أدناه لقبول العرض وبدء إجراءات الحجز.'
          : 'Ready to proceed? Confirm your name below to accept the quote and begin the booking process.'}
      </p>
      <AcceptForm deliveryId={delivery.id} versionId={version.id} quoteId={quote.id} clientName={clientName} />
    </div>
  ) : null

  return (
    <ProposalView
      isArabic={isArabic}
      refNumber={quote.quote_number}
      clientName={clientName}
      clientFirstName={clientFirstName}
      title={version.title || (isArabic ? 'عرض سعر رحلتك' : 'Your Safari Quote')}
      days={days}
      nights={nights}
      travellersLabel={travellersLabel}
      startLabel={fmtDate(version.travel_start_date)}
      endLabel={fmtDate(version.travel_end_date)}
      validUntil={version.valid_until}
      heroImage={heroImage}
      company={{
        name: companyName,
        logoUrl: settings?.logo_url ?? null,
        email: settings?.email ?? null,
        phone: settings?.phone ?? null,
        whatsapp: settings?.whatsapp ?? null,
        website: (settings as any)?.website ?? site.domain,
      }}
      agentName={null}
      arrivalNote={null}
      startDestination={(quoteDays ?? [])[0] ? ((quoteDays as any)[0].destination_snapshot as any)?.name ?? null : null}
      summaryRows={summaryRows}
      itinerary={itinerary}
      included={included}
      excluded={isArabic ? EXCLUDED_AR : EXCLUDED_EN}
      optional={optional}
      travellerGroups={travellerGroups}
      grandTotalLabel={`$${fmt(grandTotal)} USD`}
      aboutText={isArabic
        ? `${companyName} مشغّل رحلات متخصص في تنظيم رحلات السفاري ومغامرات الدراجات النارية المصممة خصيصاً عبر كينيا وشرق أفريقيا.`
        : `${companyName} is a tour operator specializing in tailor-made safaris and motorbike adventures across Kenya and East Africa.`}
      status={{
        accepted: isAccepted,
        acceptedBy: acceptance?.client_name ?? null,
        acceptedOn: acceptance ? fmtDate(acceptance.accepted_at) : null,
        declined: isDeclined,
      }}
      acceptSlot={acceptSlot}
      printHref={`/quote/${token}/print`}
    />
  )
}

import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import PrintToolbar from './print-toolbar'

const MEAL_LABELS: Record<string, string> = { B: 'Breakfast', L: 'Lunch', D: 'Dinner' }
const MEAL_LABELS_AR: Record<string, string> = { B: 'إفطار', L: 'غداء', D: 'عشاء' }

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const G = '#7A9A4A'

function momentAr(m: string) {
  return ({ morning: 'صباحاً', afternoon: 'بعد الظهر', evening: 'مساءً', night: 'ليلاً' } as Record<string, string>)[m] ?? m
}

const CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; font-size: 13px; }
.page { max-width: 780px; margin: 0 auto; padding: 28px 40px; position: relative; }
.sec-bar { display: flex; align-items: center; margin-bottom: 24px; }
.sec-pill { background: ${G}; color: #fff; font-size: 12px; font-weight: 700; padding: 5px 18px 5px 14px; border-radius: 20px 0 0 20px; white-space: nowrap; flex-shrink: 0; }
.sec-line { flex: 1; height: 2px; background: #1a1a1a; }
.sec-end { padding-left: 12px; font-size: 12px; color: #555; font-weight: 600; white-space: nowrap; font-family: 'Helvetica Neue', Arial, sans-serif; }
.sec-end-r { padding-left: 10px; font-size: 13px; font-weight: 700; color: #333; font-family: 'Helvetica Neue', Arial, sans-serif; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 14px; border: 1px solid #c8e0a0; border-radius: 8px; padding: 12px 16px; background: #f8fdf0; margin-bottom: 22px; }
.meta-label { font-size: 10px; color: #777; margin-bottom: 3px; font-family: 'Helvetica Neue', Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.3px; }
.meta-val { font-size: 13px; font-weight: 700; }
.letter-card { background: #232323; color: #ddd; border-radius: 12px; padding: 28px 32px; margin: 16px 0 28px; }
.letter-card p { margin: 0 0 10px; font-size: 13px; line-height: 1.75; }
.letter-sig { border-top: 1px solid #3a3a3a; margin-top: 20px; padding-top: 16px; display: flex; align-items: center; gap: 14px; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.box { border: 1px solid #d0e8b0; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; background: #fafdf5; }
.box-meal { border-color: #e8dda0; background: #fffdf0; }
.box-title { font-size: 12px; font-weight: 700; margin-bottom: 9px; font-family: 'Helvetica Neue', Arial, sans-serif; }
.box-title span { font-weight: 400; }
.bullet { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; margin-bottom: 5px; line-height: 1.45; }
.arrow { color: ${G}; flex-shrink: 0; font-style: normal; }
.accom-card { display: flex; align-items: flex-start; gap: 10px; border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
.accom-meta { font-size: 10px; color: #999; margin-bottom: 3px; font-family: 'Helvetica Neue', Arial, sans-serif; }
.accom-name { font-size: 13px; font-weight: 700; }
.summary-tbl { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; }
.summary-tbl th { text-align: left; padding: 8px 10px; color: #fff; border-bottom: 2px solid ${G}; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; font-family: 'Helvetica Neue', Arial, sans-serif; background: ${G}; }
.summary-tbl td { padding: 9px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
.summary-tbl tr:nth-child(even) td { background: #fafff5; }
.cost-tbl { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #e8e8e8; border-radius: 8px; overflow: hidden; }
.cost-tbl th { text-align: left; padding: 8px 14px; font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 2px solid #c8e0a0; background: #f8fdf0; font-family: 'Helvetica Neue', Arial, sans-serif; }
.cost-tbl th.r { text-align: right; }
.cost-tbl td { padding: 10px 14px; border-bottom: 1px solid #f0f0f0; }
.cost-tbl td.r { text-align: right; }
.cost-tbl tr.cost-total td { border-bottom: none; font-weight: 700; font-size: 14px; background: #f8fdf0; border-top: 2px solid #c8e0a0; }
.incl-excl { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; }
.incl { border: 1px solid #c8e0a0; border-radius: 8px; padding: 14px; }
.excl { border: 1px solid #f5c0c0; border-radius: 8px; padding: 14px; }
.incl-hd { color: ${G}; font-weight: 700; font-size: 12px; margin-bottom: 8px; font-family: 'Helvetica Neue', Arial, sans-serif; }
.excl-hd { color: #c0392b; font-weight: 700; font-size: 12px; margin-bottom: 8px; font-family: 'Helvetica Neue', Arial, sans-serif; }
.sm { font-size: 11px; line-height: 1.7; color: #444; margin: 0; }
.contact-box { border: 1px solid #c8e0a0; border-radius: 10px; padding: 16px 20px; max-width: 420px; background: #fafdf5; }
.contact-row { display: flex; gap: 12px; margin-bottom: 6px; font-size: 12px; }
.contact-lbl { font-weight: 700; color: #555; min-width: 70px; flex-shrink: 0; }
.ft { display: flex; justify-content: space-between; border-top: 1px solid #eee; margin-top: 36px; padding-top: 8px; font-size: 10px; color: #aaa; font-family: 'Helvetica Neue', Arial, sans-serif; }
.confirm-btn { display: inline-block; background: ${G}; color: #fff; padding: 11px 28px; border-radius: 7px; font-weight: 700; text-decoration: none; font-size: 14px; margin-top: 20px; font-family: 'Helvetica Neue', Arial, sans-serif; }
.pax-strip { display: flex; border: 1px solid #c8e0a0; border-radius: 8px; overflow: hidden; margin-bottom: 22px; }
.pax-cell { padding: 10px 20px; border-right: 1px solid #c8e0a0; background: #f8fdf0; }
.pax-cell:last-child { border-right: none; }
.pax-lbl { font-size: 10px; color: #777; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; font-family: 'Helvetica Neue', Arial, sans-serif; }
.pax-val { font-size: 13px; font-weight: 700; }
.day-card { border: 1px solid #e6e6e6; border-radius: 10px; padding: 13px 16px; margin-bottom: 12px; }
.day-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
.day-pill { background: ${G}; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 12px; border-radius: 14px; white-space: nowrap; }
.day-dest { font-size: 12px; color: #444; }
.day-meals { margin-left: auto; font-size: 10px; color: #999; }
.day-title { font-size: 14px; font-weight: 700; margin: 0 0 6px; }
.day-desc { font-size: 12.5px; line-height: 1.7; color: #333; margin: 0 0 8px; }
.day-line { font-size: 11.5px; color: #555; margin: 2px 0; }
.day-line strong { color: #333; }
.day-ico { margin-right: 5px; color: ${G}; }
.day-notes { font-size: 11px; color: #666; font-style: italic; margin: 6px 0 0; }
.day-photos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 8px 0 0; }
.day-photos img { width: 100%; height: 62px; object-fit: cover; border-radius: 6px; border: 1px solid #e6e6e6; }
h1 { font-size: 30px; font-weight: 800; margin: 0 0 6px; line-height: 1.2; }
h2 { font-size: 22px; font-weight: 800; margin: 0 0 14px; line-height: 1.2; }
h3 { font-size: 15px; font-weight: 700; margin: 0 0 12px; }
@media print {
  .no-print { display: none !important; }
  @page { margin: 1.5cm 2cm; size: A4 portrait; }
  .pb { break-after: page; page-break-after: always; }
  .nb { break-inside: avoid; page-break-inside: avoid; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .confirm-btn { display: none !important; }
}
`

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
      .select('id, version_number, title, language, travel_start_date, travel_end_date, valid_until, total_selling_usd, sharing_price_per_person_usd, single_price_per_person_usd, cost_base_usd, default_markup_percent, inclusions, exclusions')
      .eq('id', delivery.quote_version_id).single(),
    admin.from('quotes')
      .select('id, quote_number, mode, client_id, tour_id')
      .eq('id', delivery.quote_id).single(),
    admin.from('quote_days')
      .select('id, day_number, day_date, title, description_en, client_notes, title_ar, description_ar, client_notes_ar, destination_snapshot, meals, photos')
      .eq('quote_version_id', delivery.quote_version_id)
      .order('day_number'),
    admin.from('quote_price_lines')
      .select('id, description, cost_category, total_selling_usd, is_optional')
      .eq('quote_version_id', delivery.quote_version_id)
      .eq('is_client_visible', true)
      .order('sort_order'),
    admin.from('company_settings')
      .select('company_name, logo_url, email, phone, whatsapp, address, bank_account_name, bank_account_number, bank_name, bank_account_type, deposit_percent')
      .limit(1).maybeSingle(),
  ])

  if (!version || !quote) notFound()

  const [{ data: client }, { data: quoteTravellers }] = await Promise.all([
    admin.from('clients')
      .select('first_name, last_name, email')
      .eq('id', (quote as any).client_id)
      .single(),
    admin.from('quote_travellers')
      .select('id, display_name, traveller_category, age_band_snapshot, room_category, is_paying, is_complimentary, pricing_fixed_amount_usd')
      .eq('quote_version_id', delivery.quote_version_id)
      .order('sort_order'),
  ])

  const { data: tourData } = (quote as any)?.tour_id
    ? await admin.from('tours').select('title_en').eq('id', (quote as any).tour_id).single()
    : { data: null as any }

  const dayIds = (quoteDays ?? []).map((d: any) => d.id)
  const { data: dayItems } = dayIds.length
    ? await admin.from('quote_day_items')
        .select('quote_day_id, item_type, activity_id, title_snapshot, content_snapshot, sort_order')
        .in('quote_day_id', dayIds)
        .in('item_type', ['accommodation', 'activity'])
        .order('sort_order')
    : { data: [] as any[] }

  type ActItem = { name: string; activity_id: string | null; moment: string; optional: boolean }
  const accomByDay: Record<string, string[]> = {}
  const accomDescByDay: Record<string, string[]> = {}
  const actsByDay: Record<string, ActItem[]> = {}
  for (const item of dayItems ?? []) {
    if (item.item_type === 'accommodation') {
      if (!accomByDay[item.quote_day_id]) accomByDay[item.quote_day_id] = []
      if (!accomDescByDay[item.quote_day_id]) accomDescByDay[item.quote_day_id] = []
      if (item.title_snapshot) accomByDay[item.quote_day_id].push(item.title_snapshot)
      if (item.content_snapshot) accomDescByDay[item.quote_day_id].push(item.content_snapshot)
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

  const isArabic = (version as any)?.language === 'ar'
  const clientName = client ? `${client.first_name} ${client.last_name}`.trim() : 'Guest'
  const clientFirst = client?.first_name ?? clientName
  const companyName = settings?.company_name ?? 'Safari Adventures'
  const totalSelling = Number(version.total_selling_usd ?? 0)
  const sharingPp = Number(version.sharing_price_per_person_usd ?? 0)
  const costBase = Number(version.cost_base_usd ?? 0)
  const markupPercent = Number(version.default_markup_percent ?? 0)
  const tourTitle = version.title || 'Safari Quotation'
  const heroImage = (tourData as any)?.image_url ?? (tourData as any)?.hero_image_url ?? null

  const days = quoteDays ?? []
  const numDays = days.length
  const numNights = Math.max(0, numDays - 1)
  const durationStr = numDays > 0
    ? `${numDays} Day${numDays !== 1 ? 's' : ''} / ${numNights} Night${numNights !== 1 ? 's' : ''}`
    : '—'
  const startDest = (days[0]?.destination_snapshot as any)?.name ?? ''
  const endDest = (days[days.length - 1]?.destination_snapshot as any)?.name ?? ''

  const includedLines = (priceLines ?? []).filter((l: any) => !l.is_optional)
  const optionalLines  = (priceLines ?? []).filter((l: any) => l.is_optional)
  const optionalAccomLines = optionalLines.filter((l: any) => l.cost_category === 'accommodation')
  const otherOptionalLines = optionalLines.filter((l: any) => l.cost_category !== 'accommodation')

  // Cost → pricing breakdown
  const payingTravellers = (quoteTravellers ?? []).filter((t: any) => t.is_paying && !t.is_complimentary)

  // Total selling: prefer the Trip Builder's rolled-up total, fallback to legacy cost base + markup
  const totalSellingDerived = totalSelling > 0
    ? totalSelling
    : costBase > 0
      ? (markupPercent > 0 ? costBase * (1 + markupPercent / 100) : costBase)
      : 0

  // Derive per-person base if not explicitly stored
  let effectiveSharingPp = sharingPp
  if (effectiveSharingPp === 0 && totalSellingDerived > 0 && payingTravellers.length > 0) {
    const weightedSum = (payingTravellers as any[]).reduce((s: number, t: any) => {
      const pct = ((t.age_band_snapshot as any)?.default_percentage ?? 100) / 100
      return s + pct
    }, 0)
    effectiveSharingPp = weightedSum > 0
      ? totalSellingDerived / weightedSum
      : totalSellingDerived / payingTravellers.length
  }

  type TravellerGroup = { name: string; count: number; perPerson: number; total: number }
  const travellerGroupMap: Record<string, TravellerGroup> = {}
  for (const t of payingTravellers as any[]) {
    const band = t.age_band_snapshot as any
    const bandKey = band?.code ?? t.traveller_category ?? 'adult'
    const bandName = band?.name ?? (t.traveller_category === 'adult' ? 'Adult' : 'Child')
    const bandPct = (band?.default_percentage ?? 100) / 100
    // A manually-set per-person price (pricing step) wins over the split.
    const fixed = t.pricing_fixed_amount_usd != null ? Number(t.pricing_fixed_amount_usd) : null
    const pp = fixed !== null && fixed > 0 ? fixed : (effectiveSharingPp > 0 ? effectiveSharingPp * bandPct : 0)
    if (!travellerGroupMap[bandKey]) {
      travellerGroupMap[bandKey] = { name: bandName, count: 0, perPerson: pp, total: 0 }
    }
    travellerGroupMap[bandKey].count++
    travellerGroupMap[bandKey].total += pp
  }
  const travellerGroups = Object.values(travellerGroupMap)
  const grandTotal = travellerGroups.reduce((s, g) => s + g.total, 0) || totalSellingDerived

  // Pax summary for pricing page
  const adultPax = payingTravellers.filter((t: any) => !t.traveller_category || t.traveller_category === 'adult').length
  const childPax = payingTravellers.filter((t: any) => t.traveller_category && t.traveller_category !== 'adult').length
  const paxStr = [
    adultPax > 0 ? `${adultPax} Adult${adultPax !== 1 ? 's' : ''}` : '',
    childPax > 0 ? `${childPax} Child${childPax !== 1 ? 'ren' : ''}` : '',
  ].filter(Boolean).join(', ') || (payingTravellers.length > 0 ? `${payingTravellers.length} Pax` : '—')

  function dayLabel(day: any) {
    if (day.day_number_end && day.day_number_end !== day.day_number) return `${day.day_number} & ${day.day_number_end}`
    return String(day.day_number)
  }

  const ml = isArabic ? MEAL_LABELS_AR : MEAL_LABELS

  const T = isArabic ? {
    proposal: 'عرض سفر', summary: 'ملخص', pricing: 'التسعير', aboutUs: 'من نحن',
    tourLength: 'مدة الرحلة', traveler: 'المسافر', startTour: 'بداية الرحلة', endTour: 'نهاية الرحلة',
    dayByDay: 'يوم بيوم', arrival: 'الوصول', startDestLbl: 'نقطة البداية:', endDestLbl: 'نقطة النهاية:',
    dayCols: ['اليوم', 'الوجهة التالية', 'الإقامة', 'خطة الوجبات'],
    day: 'يوم', included: 'ما يشمله', excluded: 'ما لا يشمله',
    breakdown: 'تفاصيل التكاليف', travellers: 'المسافرون',
    colTraveller: 'المسافر', colPP: 'للشخص', colTotal: 'الإجمالي',
    totalInUSD: 'الإجمالي بالدولار',
    optional: 'إضافات اختيارية', contactUs: 'تواصل معنا',
    thisOfferFor: `هذا العرض لـ: ${clientFirst.toUpperCase()}`,
    dear: `عزيزي/عزيزتي ${clientFirst}،`,
    p1: 'شكرًا على اهتمامكم.',
    p2: `يسعدنا تقديم هذا العرض المخصص لرحلة "${tourTitle}" بناءً على طلبكم. تبدأ الرحلة في ${startDest || 'الوجهة المحددة'} وتمتد على مدار ${numDays} أيام.`,
    p3: 'لا تترددوا في التواصل معنا لأي استفسارات. نتطلع إلى مساعدتكم في تخطيط رحلة أحلامكم.',
    regards: 'مع خالص التحيات',
    inclText: 'جميع الأنشطة (ما لم تُشَر إلى أنها اختيارية)، الوجبات، رسوم الحدائق، جميع مرافق الإقامة، المرشد المتخصص، جميع وسائل النقل.',
    exclText: 'المواد الشخصية، تأمين السفر، رسوم التأشيرة، الزيادات الضريبية الحكومية، الإكراميات ($10 للشخص/يوم)، الرحلات الجوية الدولية.',
    aboutDesc: `${companyName} هي شركة رائدة في السياحة، متخصصة في رحلات السفاري والتجارب الثقافية في شرق أفريقيا.`,
    address: 'العنوان', email: 'البريد', phone: 'الهاتف',
    noAccom: 'بدون إقامة', confirmBooking: 'تأكيد الحجز',
    accomPackages: 'باقات الإقامة', accomPackagesNote: 'يمكن إضافتها بسعر إضافي',
    colPackage: 'الباقة', colAddPrice: 'السعر الإضافي',
    seeItinerary: (a: number, b: number) => `انظر البرنامج التفصيلي في صفحة ${a}–${b}`,
    arrivalLine: (dest: string) => `✈ الوصول: ${dest}، النقل من المطار مشمول`,
    endDestLine: (dest: string) => `✈ نقطة النهاية: ${dest}`,
    validUntil: (d: string) => `هذا العرض صالح حتى ${d} ورهن بالتوفر عند التأكيد.`,
    howToPay: 'كيفية الدفع', bankLbl: 'البنك', accountNameLbl: 'اسم الحساب',
    accountNumberLbl: 'رقم الحساب', accountTypeLbl: 'نوع الحساب',
    payNote: (dep: number | null) => dep
      ? `يؤكد دفع عربون بنسبة ${dep}٪ حجزك، ويستحق الرصيد المتبقي قبل السفر. ادفع عبر التحويل البنكي باستخدام التفاصيل التالية.`
      : 'ادفع عبر التحويل البنكي باستخدام التفاصيل التالية، ثم أرسل لنا تأكيد التحويل.',
  } : {
    proposal: 'Proposal', summary: 'Summary', pricing: 'Pricing', aboutUs: 'About Us',
    tourLength: 'Tour Length', traveler: 'Traveler', startTour: 'Start Tour', endTour: 'End Tour',
    dayByDay: 'Day by Day', arrival: 'Arrival', startDestLbl: 'Start Destination:', endDestLbl: 'End Destination:',
    dayCols: ['Days', 'Next Destination', 'Accommodation', 'Meal Plan'],
    day: 'Day', included: 'Included', excluded: 'Excluded',
    breakdown: 'Breakdown of Costs', travellers: 'Travellers',
    colTraveller: 'Traveller', colPP: 'Per Person', colTotal: 'Total',
    totalInUSD: 'Total in USD',
    optional: 'Optional Add-ons', contactUs: 'Contact Us',
    thisOfferFor: `This offer for: ${clientFirst.toUpperCase()}`,
    dear: `Dear ${clientFirst},`,
    p1: 'Thank you for your inquiry.',
    p2: `It is our pleasure to send you a custom-made quote for our ${tourTitle} as per your request. The tour begins in ${startDest || 'the specified destination'} and runs for ${numDays} day${numDays !== 1 ? 's' : ''}.`,
    p3: 'Please do not hesitate to contact us if you have any questions. We look forward to helping you plan your safari trip of a lifetime.',
    regards: 'Best regards',
    inclText: 'All activities (unless indicated as optional), Meals (as specified in the itinerary), Park fees, All accommodations, Professional guide, All transportation (Unless labeled as optional).',
    exclText: 'Personal items (Souvenirs, travel insurance, visa fees, tips and gratuities, internet, unusual beverages), each fees. Additional accommodation before and at the end of the tour. Tips (Tipping guideline $50.00 pp per day), International flights.',
    aboutDesc: `${companyName} is a leading tour operator specializing in wildlife safaris and cultural experiences in East Africa.`,
    address: 'Address', email: 'Email', phone: 'Phone',
    noAccom: 'No accommodation', confirmBooking: 'Confirm Booking',
    accomPackages: 'Accommodation Packages', accomPackagesNote: `For more details see from page ${3 + days.length}`,
    colPackage: 'Package', colAddPrice: 'Additional Price',
    seeItinerary: (a: number, b: number) => `See your full itinerary on Page ${a}–${b}`,
    arrivalLine: (dest: string) => `✈ Arrival: ${dest}, Airport transfer included`,
    endDestLine: (dest: string) => `✈ End Destination: ${dest}`,
    validUntil: (d: string) => `This quotation is valid until ${d} and subject to availability at time of confirmation.`,
    howToPay: 'How to pay', bankLbl: 'Bank', accountNameLbl: 'Account name',
    accountNumberLbl: 'Account number', accountTypeLbl: 'Account type',
    payNote: (dep: number | null) => dep
      ? `A deposit of ${dep}% confirms your booking; the balance is due before travel. Pay by bank transfer using the details below.`
      : 'Pay by bank transfer using the details below, then send us your transfer confirmation.',
  }

  const itinStart = 3
  const itinEnd = 2 + days.length
  const pricingPageNum = 3 + days.length

  return (
    <>
      <style>{CSS + (isArabic ? `[dir="rtl"], [dir="rtl"] * { font-family: 'Cairo', var(--font-arabic), Arial, sans-serif !important; }` : '')}</style>
      {isArabic && (
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" />
      )}

      <PrintToolbar />

      <div dir={isArabic ? 'rtl' : 'ltr'}>

        {/* ── PAGE 1: COVER ── */}
        <div className="page pb">
          <div className="sec-bar">
            <div className="sec-pill">{T.proposal}</div>
            <div className="sec-line" />
            <div className="sec-end">{quote.quote_number}</div>
            <div className="sec-end-r">&nbsp;&nbsp;{clientFirst.toUpperCase()}</div>
          </div>

          <div className="meta-grid">
            <div>
              <div className="meta-label">{T.tourLength}</div>
              <div className="meta-val">{durationStr}</div>
            </div>
            <div>
              <div className="meta-label">{T.traveler}</div>
              <div className="meta-val">{clientName}</div>
            </div>
            <div>
              <div className="meta-label">{T.startTour}</div>
              <div className="meta-val">{fmtDate(version.travel_start_date)}</div>
            </div>
            <div>
              <div className="meta-label">{T.endTour}</div>
              <div className="meta-val">{fmtDate(version.travel_end_date)}</div>
            </div>
          </div>

          <h1>{tourTitle}</h1>

          <div className="letter-card">
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{T.dear}</p>
            <p>{T.p1}</p>
            <p>{T.p2}</p>
            <p>{T.p3}</p>
            <p style={{ color: '#aaa', marginBottom: 0 }}>{T.regards}</p>
            <div className="letter-sig">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt={companyName} style={{ height: 44, width: 'auto', borderRadius: '50%', background: '#fff', padding: 2 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
                  {companyName[0]}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{companyName}</div>
                <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>
                  {settings?.phone && <span>Phone&nbsp;{settings.phone}</span>}
                  {settings?.phone && settings?.email && <span> &middot; </span>}
                  {settings?.email && <span>Email&nbsp;{settings.email}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="ft">
            <span>Page 1</span>
            <span>{quote.quote_number}</span>
            <span>{companyName}</span>
          </div>
        </div>

        {/* ── PAGE 2: SUMMARY ── */}
        {days.length > 0 && (
          <div className="page pb">
            <div className="sec-bar">
              <div className="sec-pill">{T.summary}</div>
              <div className="sec-line" />
            </div>

            {/* Title row with thumbnail */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
              <h2 style={{ margin: 0, flex: 1 }}>{tourTitle}</h2>
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroImage} alt={tourTitle} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 120, height: 80, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg, #2a5a0a 0%, #7A9A4A 50%, #c8e0a0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28 }}>
                  🦁
                </div>
              )}
            </div>

            <h3 style={{ borderBottom: `2px solid ${G}`, paddingBottom: 6, marginBottom: 10 }}>{T.dayByDay}</h3>

            {/* Arrival + itinerary reference */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 11 }}>
              <span style={{ color: '#555' }}>
                {startDest ? T.arrivalLine(startDest) : ''}
              </span>
              <span style={{ color: '#888', fontStyle: 'italic' }}>
                {T.seeItinerary(itinStart, itinEnd)}
              </span>
            </div>

            <table className="summary-tbl">
              <thead>
                <tr>
                  {T.dayCols.map((col, i) => (
                    <th key={i} style={i === 0 ? { width: '16%' } : i === 1 ? { width: '22%' } : i === 2 ? { width: '36%' } : { width: '26%' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day: any) => {
                  const dest = (day.destination_snapshot as any)?.name ?? '—'
                  const accoms = accomByDay[day.id] ?? []
                  const accomDescs = accomDescByDay[day.id] ?? []
                  const dayMeals: string[] = day.meals ?? []
                  const mealStr = dayMeals.map((m: string) => ml[m] ?? m).join(', ') || '—'
                  const dl = dayLabel(day)
                  return (
                    <tr key={day.id}>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', border: `2px solid ${G}`, display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{T.day} {dl}</span>
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#333' }}>{dest}</td>
                      <td>
                        {accoms.length > 0 ? (
                          <div>
                            <div style={{ fontWeight: 600 }}>{accoms[0]}</div>
                            {accomDescs[0] && (
                              <div style={{ fontSize: 10, color: '#999', marginTop: 2, fontStyle: 'italic' }}>{accomDescs[0]}</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#bbb', fontSize: 11 }}>{T.noAccom}</span>
                        )}
                      </td>
                      <td style={{ color: '#555', fontSize: 11 }}>{mealStr}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {endDest && (
              <p style={{ fontSize: 11, color: '#555', marginTop: 10, marginBottom: 0 }}>
                {T.endDestLine(endDest)}
              </p>
            )}

            <div className="ft">
              <span>Page 2 | {fmtDate(version.travel_start_date)}</span>
              <span>{quote.quote_number}</span>
              <span>{companyName}</span>
            </div>
          </div>
        )}

        {/* ── DAILY ITINERARY (flowing cards, fills pages) ── */}
        {days.length > 0 && (
          <div className="page pb">
            <div className="sec-bar">
              <div className="sec-pill">{T.dayByDay}</div>
              <div className="sec-line" />
            </div>

            {days.map((day: any, idx: number) => {
              const destId = (day.destination_snapshot as any)?.id
              const dest = (day.destination_snapshot as any)?.name ?? ''
              const accoms = accomByDay[day.id] ?? []
              const acts = actsByDay[day.id] ?? []
              const dayMeals: string[] = day.meals ?? []
              const isLast = idx === days.length - 1
              const dl = dayLabel(day)
              const title = (isArabic && day.title_ar ? day.title_ar : day.title)
                || (isLast ? (isArabic ? 'اليوم الأخير معنا' : 'The last day with us') : (dest || `Day ${day.day_number}`))
              const dd = destId ? destDescMap[destId] : null
              const desc = dd ? (isArabic ? (dd.ar || dd.en) : dd.en) : null
              const notes = isArabic && day.client_notes_ar ? day.client_notes_ar : day.client_notes
              const actLabel = acts.length > 1 ? (isArabic ? 'أنشطة' : 'Activities') : (isArabic ? 'نشاط' : 'Activity')

              return (
                <div key={day.id} className="day-card nb">
                  <div className="day-card-head">
                    <span className="day-pill">{T.day} {dl}</span>
                    {dest && <span className="day-dest">📍 {dest}</span>}
                    {dayMeals.length > 0 && (
                      <span className="day-meals">🍴 {dayMeals.map((m: string) => ml[m] ?? m).join(', ')}</span>
                    )}
                  </div>
                  <h3 className="day-title">{title}</h3>
                  {desc && <p className="day-desc">{desc}</p>}
                  {accoms.length > 0 && (
                    <p className="day-line"><span className="day-ico">🏠</span><strong>{T.dayCols[2]}:</strong> {accoms.join(' · ')}</p>
                  )}
                  {acts.length > 0 && (
                    <div className="day-line">
                      <strong>{actLabel}:</strong>
                      {acts.map((a, ai) => {
                        const dd = a.activity_id ? actDescMap[a.activity_id] : null
                        const adesc = dd ? (isArabic ? (dd.ar || dd.en) : dd.en) : null
                        const mom = a.moment ? (isArabic ? momentAr(a.moment) : a.moment) : ''
                        return (
                          <div key={ai} style={{ marginTop: 3 }}>
                            <span className="day-ico">→</span>
                            <strong>{a.name}</strong>
                            {mom ? <span style={{ color: '#999' }}> · {mom}</span> : null}
                            {a.optional ? <span style={{ color: '#C97A1A' }}> · {isArabic ? 'اختياري' : 'optional'}</span> : null}
                            {adesc ? <div style={{ color: '#666', fontSize: 11 }}>{adesc}</div> : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {notes && <p className="day-notes">{notes}</p>}
                  {Array.isArray(day.photos) && day.photos.length > 0 && (
                    <div className="day-photos">
                      {day.photos.slice(0, 4).map((url: string, pi: number) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={pi} src={url} alt="" />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            <div className="ft">
              <span>{quote.quote_number}</span>
              <span>{companyName}</span>
            </div>
          </div>
        )}

        {/* ── PRICING PAGE ── */}
        <div className="page pb">
          <div className="sec-bar">
            <div className="sec-pill">{T.pricing}</div>
            <div className="sec-line" />
            <div className="sec-end-r">{T.thisOfferFor}</div>
          </div>

          {/* Duration + pax strip */}
          <div className="pax-strip nb">
            <div className="pax-cell">
              <div className="pax-lbl">{T.tourLength}</div>
              <div className="pax-val">{durationStr}</div>
            </div>
            <div className="pax-cell">
              <div className="pax-lbl">{T.travellers}</div>
              <div className="pax-val">{paxStr}</div>
            </div>
          </div>

          {/* Included / Excluded — the version's customised lists win, then
              visible price lines, then the language defaults. */}
          <div className="incl-excl nb">
            <div className="incl">
              <div className="incl-hd">⊕ {T.included}</div>
              {((version as any).inclusions as string[] | null)?.length ? (
                <p className="sm">{((version as any).inclusions as string[]).join(', ')}</p>
              ) : includedLines.length > 0 ? (
                <p className="sm">
                  {includedLines.map((l: any, i: number) => (
                    <span key={l.id}>{l.description}{i < includedLines.length - 1 ? ', ' : ''}</span>
                  ))}
                </p>
              ) : (
                <p className="sm">{T.inclText}</p>
              )}
            </div>
            <div className="excl">
              <div className="excl-hd">⊖ {T.excluded}</div>
              {((version as any).exclusions as string[] | null)?.length ? (
                <p className="sm">{((version as any).exclusions as string[]).join(', ')}</p>
              ) : (
                <p className="sm">{T.exclText}</p>
              )}
            </div>
          </div>

          <h3 style={{ fontSize: 16 }}>{T.breakdown}</h3>

          {/* Per-traveller breakdown table */}
          {travellerGroups.length > 0 ? (
            <table className="cost-tbl nb" style={{ marginBottom: 20 }}>
              <thead>
                <tr>
                  <th>{T.colTraveller}</th>
                  <th className="r">{T.colPP}</th>
                  <th className="r">{T.colTotal}</th>
                </tr>
              </thead>
              <tbody>
                {travellerGroups.map((g, i) => (
                  <tr key={i}>
                    <td>{g.count}x {g.name}</td>
                    <td className="r" style={{ fontWeight: 600 }}>
                      {g.perPerson > 0 ? `$${fmt(g.perPerson)}` : '—'}
                    </td>
                    <td className="r" style={{ fontWeight: 600 }}>
                      {g.total > 0 ? `$${fmt(g.total)}` : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="cost-total">
                  <td colSpan={2}><strong>{T.totalInUSD}</strong></td>
                  <td className="r">${fmt(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          ) : grandTotal > 0 ? (
            <table className="cost-tbl nb" style={{ marginBottom: 20 }}>
              <tbody>
                <tr className="cost-total">
                  <td><strong>{T.totalInUSD}</strong></td>
                  <td className="r">${fmt(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          ) : null}

          {/* Confirm Booking */}
          <a
            href={`mailto:${settings?.email ?? ''}?subject=Booking Confirmation - ${quote.quote_number}&body=I would like to confirm my booking for ${tourTitle}.`}
            className="confirm-btn no-print"
          >
            {T.confirmBooking}
          </a>

          {/* Accommodation Packages */}
          {optionalAccomLines.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 15 }}>{T.accomPackages}</h3>
              <p style={{ fontSize: 11, color: '#888', marginTop: -8, marginBottom: 12 }}>{T.accomPackagesNote}</p>
              <table className="cost-tbl nb">
                <thead>
                  <tr>
                    <th>{T.colPackage}</th>
                    <th className="r">{T.colAddPrice}</th>
                  </tr>
                </thead>
                <tbody>
                  {optionalAccomLines.map((line: any) => (
                    <tr key={line.id}>
                      <td>{line.description}</td>
                      <td className="r" style={{ fontWeight: 600 }}>${fmt(Number(line.total_selling_usd))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Other optional add-ons */}
          {otherOptionalLines.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 15 }}>{T.optional}</h3>
              <table className="cost-tbl nb">
                <tbody>
                  {otherOptionalLines.map((line: any) => (
                    <tr key={line.id}>
                      <td>{line.description}</td>
                      <td className="r" style={{ fontWeight: 600 }}>${fmt(Number(line.total_selling_usd))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(settings?.bank_account_number || settings?.bank_name) && (
            <div className="contact-box" style={{ marginTop: 24 }}>
              <h3 style={{ color: G, margin: '0 0 8px', fontSize: 14 }}>{T.howToPay}</h3>
              <p style={{ fontSize: 12, color: '#555', margin: '0 0 14px', lineHeight: 1.6 }}>
                {T.payNote(settings?.deposit_percent ? Number(settings.deposit_percent) : null)}
              </p>
              {settings?.bank_name && (
                <div className="contact-row"><span className="contact-lbl">{T.bankLbl}</span><span>{settings.bank_name}</span></div>
              )}
              {settings?.bank_account_name && (
                <div className="contact-row"><span className="contact-lbl">{T.accountNameLbl}</span><span>{settings.bank_account_name}</span></div>
              )}
              {settings?.bank_account_number && (
                <div className="contact-row"><span className="contact-lbl">{T.accountNumberLbl}</span><span>{settings.bank_account_number}</span></div>
              )}
              {settings?.bank_account_type && (
                <div className="contact-row"><span className="contact-lbl">{T.accountTypeLbl}</span><span>{settings.bank_account_type}</span></div>
              )}
            </div>
          )}

          {version.valid_until && (
            <p style={{ fontSize: 11, color: '#999', marginTop: 20 }}>
              {T.validUntil(fmtDate(version.valid_until))}
            </p>
          )}

          <div className="ft">
            <span>Page {pricingPageNum}</span>
            <span>{quote.quote_number}</span>
            <span>{companyName}</span>
          </div>
        </div>

        {/* ── ABOUT / CONTACT PAGE ── */}
        <div className="page">
          <div className="sec-bar">
            <div className="sec-pill">{T.aboutUs}</div>
            <div className="sec-line" />
          </div>

          <h2 style={{ marginBottom: 6 }}>{companyName}</h2>
          <p style={{ fontSize: 13, color: '#555', marginBottom: 28, lineHeight: 1.65 }}>{T.aboutDesc}</p>

          <div className="contact-box">
            <h3 style={{ color: G, margin: '0 0 14px', fontSize: 14 }}>{T.contactUs}</h3>
            {settings?.address && (
              <div className="contact-row">
                <span className="contact-lbl">{T.address}</span>
                <span>{settings.address}</span>
              </div>
            )}
            {settings?.email && (
              <div className="contact-row">
                <span className="contact-lbl">{T.email}</span>
                <span>{settings.email}</span>
              </div>
            )}
            {settings?.phone && (
              <div className="contact-row">
                <span className="contact-lbl">{T.phone}</span>
                <span>{settings.phone}</span>
              </div>
            )}
            {settings?.whatsapp && (
              <div className="contact-row">
                <span className="contact-lbl">WhatsApp</span>
                <span>{settings.whatsapp}</span>
              </div>
            )}
          </div>

          <div className="ft">
            <span>Page {pricingPageNum + 1}</span>
            <span>{quote.quote_number}</span>
            <span>{companyName}</span>
          </div>
        </div>

      </div>
    </>
  )
}

import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'

const MEAL_LABELS: Record<string, string> = { B: 'Breakfast', L: 'Lunch', D: 'Dinner' }
const MEAL_LABELS_AR: Record<string, string> = { B: 'إفطار', L: 'غداء', D: 'عشاء' }
const CATEGORY_LABELS: Record<string, string> = {
  accommodation: 'Accommodation', activities: 'Activities', park_fees: 'Park Fees',
  transport: 'Transport', staff: 'Staff', meals: 'Meals', flights: 'Flights', other: 'Other',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

const G = '#7A9A4A'

const CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; font-size: 13px; }
body.ar { font-family: 'Noto Sans Arabic', Arial, sans-serif; }
.page { max-width: 780px; margin: 0 auto; padding: 36px 40px; min-height: 280mm; position: relative; }
.sec-bar { display: flex; align-items: center; margin-bottom: 24px; }
.sec-pill { background: ${G}; color: #fff; font-size: 12px; font-weight: 700; padding: 5px 18px 5px 14px; border-radius: 20px 0 0 20px; white-space: nowrap; flex-shrink: 0; }
.sec-line { flex: 1; height: 2px; background: #1a1a1a; }
.sec-end { padding-left: 12px; font-size: 12px; color: #555; font-weight: 600; white-space: nowrap; font-family: 'Helvetica Neue', Arial, sans-serif; }
.sec-end-r { padding-left: 10px; font-size: 12px; font-weight: 700; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 14px; border: 1px solid #c8e0a0; border-radius: 8px; padding: 12px 16px; background: #f8fdf0; margin-bottom: 22px; }
.meta-2 { grid-template-columns: 1fr 1fr; }
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
.summary-tbl { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
.summary-tbl th { text-align: left; padding: 8px 10px; color: #666; border-bottom: 2px solid #c8e0a0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; font-family: 'Helvetica Neue', Arial, sans-serif; }
.summary-tbl td { padding: 9px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
.summary-tbl tr:nth-child(even) td { background: #fafafa; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${G}; margin-right: 6px; vertical-align: middle; }
.cost-tbl { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #e8e8e8; border-radius: 8px; overflow: hidden; }
.cost-tbl th { text-align: left; padding: 8px 14px; font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 2px solid #c8e0a0; background: #f8fdf0; font-family: 'Helvetica Neue', Arial, sans-serif; }
.cost-tbl th:last-child { text-align: right; }
.cost-tbl td { padding: 10px 14px; border-bottom: 1px solid #f0f0f0; }
.cost-tbl tr.cost-total td { border-bottom: none; font-weight: 700; font-size: 14px; background: #f8fdf0; }
.cost-tbl tr:last-child td { border-bottom: none; }
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
.hero-img { width: 100%; height: 200px; object-fit: cover; border-radius: 10px; margin-bottom: 22px; }
.hero-placeholder { width: 100%; height: 180px; border-radius: 10px; margin-bottom: 22px; background: linear-gradient(135deg, #3a6b1a 0%, #7A9A4A 40%, #c8e0a0 100%); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 32px; }
.confirm-btn { display: inline-block; background: ${G}; color: #fff; padding: 11px 28px; border-radius: 7px; font-weight: 700; text-decoration: none; font-size: 14px; margin-top: 20px; font-family: 'Helvetica Neue', Arial, sans-serif; }
h1 { font-size: 30px; font-weight: 800; margin: 0 0 6px; line-height: 1.2; }
h2 { font-size: 22px; font-weight: 700; margin: 0 0 14px; }
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
      .select('id, version_number, title, language, travel_start_date, travel_end_date, valid_until, total_selling_usd, sharing_price_per_person_usd, single_price_per_person_usd, cost_base_usd, default_markup_percent')
      .eq('id', delivery.quote_version_id).single(),
    admin.from('quotes')
      .select('id, quote_number, mode, client_id, tour_id')
      .eq('id', delivery.quote_id).single(),
    admin.from('quote_days')
      .select('id, day_number, day_number_end, day_date, title, description_en, client_notes, title_ar, description_ar, client_notes_ar, destination_snapshot, meals')
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

  const [
    { data: client },
    { data: quoteTravellers },
  ] = await Promise.all([
    admin.from('clients')
      .select('first_name, last_name, email')
      .eq('id', (quote as any).client_id)
      .single(),
    admin.from('quote_travellers')
      .select('id, display_name, traveller_category, age_band_snapshot, room_category, is_paying')
      .eq('quote_version_id', delivery.quote_version_id)
      .order('sort_order'),
  ])

  const { data: tourData } = (quote as any)?.tour_id
    ? await admin.from('tours').select('title_en, image_url, hero_image_url').eq('id', (quote as any).tour_id).single()
    : { data: null as any }

  const dayIds = (quoteDays ?? []).map((d: any) => d.id)
  const { data: dayItems } = dayIds.length
    ? await admin.from('quote_day_items')
        .select('quote_day_id, item_type, title_snapshot, sort_order')
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

  const isArabic = (version as any)?.language === 'ar'
  const clientName = client ? `${client.first_name} ${client.last_name}`.trim() : 'Guest'
  const clientFirst = client?.first_name ?? clientName
  const companyName = settings?.company_name ?? 'Safari Adventures'
  const totalSelling = Number(version.total_selling_usd ?? 0)
  const sharingPp = Number(version.sharing_price_per_person_usd ?? 0)
  const singlePp = Number(version.single_price_per_person_usd ?? 0)
  const costBase = Number(version.cost_base_usd ?? 0)
  const markupPercent = Number(version.default_markup_percent ?? 0)
  const hasQuoteLevelPricing = costBase > 0
  const tourTitle = version.title || 'Safari Quotation'
  const numDays = (quoteDays ?? []).length
  const numNights = Math.max(0, numDays - 1)
  const durationStr = numDays > 0 ? `${numDays} Day${numDays !== 1 ? 's' : ''} / ${numNights} Night${numNights !== 1 ? 's' : ''}` : '—'

  const includedLines = (priceLines ?? []).filter((l: any) => !l.is_optional)
  const optionalLines = (priceLines ?? []).filter((l: any) => l.is_optional)
  const optionalAccomLines = optionalLines.filter((l: any) => l.cost_category === 'accommodation')
  const otherOptionalLines = optionalLines.filter((l: any) => l.cost_category !== 'accommodation')

  // Build traveller groups for pricing breakdown
  type TravellerGroup = { name: string; count: number; perPerson: number; total: number }
  const travellerGroupMap: Record<string, TravellerGroup> = {}
  for (const t of (quoteTravellers ?? []) as any[]) {
    if (!t.is_paying) continue
    const band = t.age_band_snapshot as any
    const bandKey = band?.code ?? t.traveller_category ?? 'adult'
    const bandName = band?.name ?? (t.traveller_category === 'adult' ? 'Adult' : 'Child')
    const isSharing = t.room_category === 'sharing'
    const basePp = isSharing ? sharingPp : singlePp
    const bandPct = (band?.default_percentage ?? 100) / 100
    const pp = basePp > 0 ? basePp * bandPct : 0
    if (!travellerGroupMap[bandKey]) {
      travellerGroupMap[bandKey] = { name: bandName, count: 0, perPerson: pp, total: 0 }
    }
    travellerGroupMap[bandKey].count++
    travellerGroupMap[bandKey].total += pp
  }
  const travellerGroups = Object.values(travellerGroupMap)
  const heroImage = (tourData as any)?.image_url ?? (tourData as any)?.hero_image_url ?? null

  const days = quoteDays ?? []
  const startDest = (days[0]?.destination_snapshot as any)?.name ?? ''
  const endDest = (days[days.length - 1]?.destination_snapshot as any)?.name ?? ''

  function dayLabel(day: any) {
    const end = day.day_number_end
    if (end && end !== day.day_number) return `${day.day_number} & ${end}`
    return `${day.day_number}`
  }

  const t = isArabic ? {
    proposal: 'عرض سفر', summary: 'ملخص', pricing: 'التسعير', aboutUs: 'من نحن',
    tourLength: 'مدة الرحلة', traveler: 'المسافر', startTour: 'بداية الرحلة', endTour: 'نهاية الرحلة',
    dayByDay: 'يوم بيوم', arrival: 'الوصول', startDest: 'نقطة البداية:', endDest: 'نقطة النهاية:',
    days: 'اليوم', dest: 'الوجهة', accom: 'الإقامة', meals: 'الوجبات',
    activity: 'نشاط', mealPlan: 'خطة الوجبات', day: 'يوم',
    included: 'ما يشمله', excluded: 'ما لا يشمله',
    breakdown: 'تفاصيل التكاليف', perSharing: 'للشخص (مشاركة)',
    perSingle: 'للشخص (غرفة منفردة)', total: 'الإجمالي بالدولار',
    optional: 'إضافات اختيارية', contactUs: 'تواصل معنا',
    ourOffer: `عرضنا لـ ${clientFirst}`,
    dear: `عزيزي/عزيزتي ${clientFirst}،`,
    p1: 'شكرًا على اهتمامكم.',
    p2: `يسعدنا تقديم هذا العرض المخصص لرحلة "${tourTitle}" بناءً على طلبكم. تبدأ الرحلة في ${startDest || 'الوجهة المحددة'} وتمتد على مدار ${numDays} أيام.`,
    p3: 'لا تترددوا في التواصل معنا لأي استفسارات. نتطلع إلى مساعدتكم في تخطيط رحلة أحلامكم.',
    regards: 'مع خالص التحيات',
    inclText: 'جميع الأنشطة (ما لم تُشَر إلى أنها اختيارية)، الوجبات، رسوم الحدائق، جميع مرافق الإقامة، المرشد المتخصص، جميع وسائل النقل.',
    exclText: 'المواد الشخصية، تأمين السفر، رسوم التأشيرة، الزيادات الضريبية الحكومية، الإكراميات ($10 للشخص/يوم)، الرحلات الجوية الدولية.',
    aboutDesc: `${companyName} هي شركة رائدة في السياحة، متخصصة في رحلات السفاري والتجارب الثقافية في شرق أفريقيا.`,
    address: 'العنوان', email: 'البريد', phone: 'الهاتف',
    noAccom: 'بدون إقامة',
    validUntil: (d: string) => `هذا العرض صالح حتى ${d} ورهن بالتوفر عند التأكيد.`,
  } : {
    proposal: 'Proposal', summary: 'Summary', pricing: 'Pricing', aboutUs: 'About Us',
    tourLength: 'Tour Length', traveler: 'Traveler', startTour: 'Start Tour', endTour: 'End Tour',
    dayByDay: 'Day by Day', arrival: 'Arrival', startDest: 'Start Destination:', endDest: 'End Destination:',
    days: 'Days', dest: 'Main Destination', accom: 'Accommodation', meals: 'Meal Plan',
    activity: 'Activity', mealPlan: 'Meal Plan', day: 'Day',
    included: 'Included', excluded: 'Excluded',
    breakdown: 'Breakdown of Costs', perSharing: 'Per person (sharing)',
    perSingle: 'Per person (single room)', total: 'Total in USD',
    optional: 'Optional Add-ons', contactUs: 'Contact Us',
    ourOffer: `Our offer for ${clientFirst}`,
    dear: `Dear ${clientFirst},`,
    p1: 'Thank you for your inquiry.',
    p2: `It is our pleasure to send you a custom-made quote for our ${tourTitle} as per your request. The tour begins in ${startDest || 'the specified destination'} and runs for ${numDays} day${numDays !== 1 ? 's' : ''}.`,
    p3: 'Please do not hesitate to contact us if you have any questions. We look forward to helping you plan your safari trip of a lifetime.',
    regards: 'Best regards',
    inclText: 'All activities (unless indicated as optional), Meals (as specified in the itinerary), Park fees, All accommodations, Professional guide, All transportation.',
    exclText: 'Personal items (souvenirs, travel insurance, visa fees, etc.), Government-imposed tax increases, Tips ($10 pp/day guideline), International flights.',
    aboutDesc: `${companyName} is a leading tour operator specializing in wildlife safaris and cultural experiences in East Africa.`,
    address: 'Address', email: 'Email', phone: 'Phone',
    noAccom: 'No accommodation',
    validUntil: (d: string) => `This quotation is valid until ${d} and subject to availability at time of confirmation.`,
  }

  const ml = isArabic ? MEAL_LABELS_AR : MEAL_LABELS

  return (
    <>
      <style>{CSS + (isArabic ? `body { font-family: 'Noto Sans Arabic', Arial, sans-serif; }` : '')}</style>
      {isArabic && (
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" />
      )}

      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 50, display: 'flex', gap: 8 }}>
        <button
          onClick={() => (window as any).print()}
          style={{ background: G, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
        >
          Print / Save PDF
        </button>
        <button
          onClick={() => (window as any).history.back()}
          style={{ background: '#fff', color: '#555', border: '1px solid #ddd', borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}
        >
          ← Back
        </button>
      </div>

      <div dir={isArabic ? 'rtl' : 'ltr'}>

        {/* ── PAGE 1: COVER ── */}
        <div className="page pb">
          <div className="sec-bar">
            <div className="sec-pill">{t.proposal}</div>
            <div className="sec-line" />
            <div className="sec-end">{quote.quote_number}</div>
            <div className="sec-end-r">&nbsp;&nbsp;{clientFirst.toUpperCase()}</div>
          </div>

          <div className="meta-grid">
            <div>
              <div className="meta-label">{t.tourLength}</div>
              <div className="meta-val">{durationStr}</div>
            </div>
            <div>
              <div className="meta-label">{t.traveler}</div>
              <div className="meta-val">{clientName}</div>
            </div>
            <div>
              <div className="meta-label">{t.startTour}</div>
              <div className="meta-val">{version.travel_start_date ? fmtDate(version.travel_start_date) : '—'}</div>
            </div>
            <div>
              <div className="meta-label">{t.endTour}</div>
              <div className="meta-val">{version.travel_end_date ? fmtDate(version.travel_end_date) : '—'}</div>
            </div>
          </div>

          <h1>{tourTitle}</h1>

          <div className="letter-card">
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 14 }}>{t.dear}</p>
            <p>{t.p1}</p>
            <p>{t.p2}</p>
            <p>{t.p3}</p>
            <p style={{ color: '#aaa', marginBottom: 0 }}>{t.regards}</p>

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
            <span>{companyName}</span>
            <span>{settings?.address ?? ''}</span>
          </div>
        </div>

        {/* ── PAGE 2: SUMMARY ── */}
        {days.length > 0 && (
          <div className="page pb">
            <div className="sec-bar">
              <div className="sec-pill">{t.summary}</div>
              <div className="sec-line" />
            </div>

            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImage} alt={tourTitle} className="hero-img" />
            ) : (
              <div className="hero-placeholder">🦁</div>
            )}

            <h2>{tourTitle}</h2>
            <h3 style={{ fontSize: 17 }}>{t.dayByDay}</h3>

            {startDest && (
              <p style={{ fontSize: 12, color: '#555', marginBottom: 4, marginTop: 0 }}>
                ✈ {t.arrival}: {startDest}, Airport transfer included
              </p>
            )}
            <p style={{ fontSize: 11, color: '#888', marginBottom: 10, marginTop: 0 }}>
              {isArabic ? `انظر البرنامج التفصيلي في صفحة ${3}–${2 + days.length}` : `See your full itinerary on Page ${3}–${2 + days.length}`}
            </p>
            <p style={{ fontSize: 12, color: '#555', marginBottom: 14, marginTop: 0 }}>
              📍 <strong>{t.startDest}</strong> {startDest || '—'}
            </p>

            <table className="summary-tbl">
              <thead>
                <tr>
                  <th>{t.days}</th>
                  <th>{t.dest}</th>
                  <th>{t.accom}</th>
                  <th>{t.meals}</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day: any) => {
                  const dest = (day.destination_snapshot as any)?.name ?? '—'
                  const accoms = accomByDay[day.id] ?? []
                  const dayMeals: string[] = day.meals ?? []
                  const mealStr = dayMeals.map((m: string) => MEAL_LABELS[m] ?? m).join(' & ') || '—'
                  const lbl = day.day_number_end && day.day_number_end !== day.day_number
                    ? `${t.day} ${day.day_number}–${day.day_number_end}`
                    : `${t.day} ${day.day_number}`
                  return (
                    <tr key={day.id}>
                      <td><span className="dot" />{lbl}</td>
                      <td style={{ fontWeight: 600 }}>{dest}</td>
                      <td style={{ color: '#444' }}>{accoms.length > 0 ? accoms[0] : t.noAccom}</td>
                      <td style={{ color: '#444' }}>{mealStr}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {endDest && (
              <p style={{ fontSize: 12, color: '#555', marginTop: 12 }}>
                📍 <strong>{t.endDest}</strong> {endDest}
              </p>
            )}

            <div className="ft">
              <span>Page 2</span>
              <span>{quote.quote_number}</span>
              <span>{companyName}</span>
            </div>
          </div>
        )}

        {/* ── DAILY ITINERARY PAGES ── */}
        {days.map((day: any, idx: number) => {
          const dest = (day.destination_snapshot as any)?.name ?? ''
          const accoms = accomByDay[day.id] ?? []
          const acts = actsByDay[day.id] ?? []
          const dayMeals: string[] = day.meals ?? []
          const isLast = idx === days.length - 1
          const dl = dayLabel(day)
          const title = (isArabic && day.title_ar ? day.title_ar : day.title)
            || (isLast ? (isArabic ? 'اليوم الأخير معنا' : 'The last day with us') : (dest || `Day ${day.day_number}`))
          const desc = isArabic && day.description_ar ? day.description_ar : day.description_en
          const notes = isArabic && day.client_notes_ar ? day.client_notes_ar : day.client_notes
          const actLabel = acts.length > 1 ? (isArabic ? 'أنشطة' : 'Activities') : t.activity

          return (
            <div key={day.id} className="page pb">
              <div className="sec-bar">
                <div className="sec-pill">{t.day} {dl}</div>
                <div className="sec-line" />
                {dest && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#444', paddingLeft: 10 }}>
                    <span>📍</span><span>{dest}</span>
                  </div>
                )}
              </div>

              <h2>{title}</h2>

              <div className="two-col">
                <div>
                  {desc && (
                    <p style={{ fontSize: 13, lineHeight: 1.75, color: '#333', margin: '0 0 16px' }}>{desc}</p>
                  )}

                  {accoms.length > 0 && (
                    <div className="accom-card nb">
                      <span style={{ fontSize: 18 }}>🏠</span>
                      <div>
                        <div className="accom-meta">{t.accom} | {t.day} {dl}</div>
                        {accoms.map((a: string, ai: number) => (
                          <div key={ai} className="accom-name">{a}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {notes && (
                    <p style={{ fontSize: 12, color: '#666', fontStyle: 'italic', lineHeight: 1.6, margin: '8px 0 0' }}>{notes}</p>
                  )}
                </div>

                <div>
                  {acts.length > 0 && (
                    <div className="box nb">
                      <div className="box-title">
                        {actLabel} <span>{t.day} {dl}</span>
                      </div>
                      {acts.map((act: string, ai: number) => (
                        <div key={ai} className="bullet">
                          <em className="arrow">→</em>
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {dayMeals.length > 0 && (
                    <div className="box box-meal nb">
                      <div className="box-title">
                        🍴 {t.mealPlan} — <span>{t.day} {dl}</span>
                      </div>
                      <div className="bullet">
                        <em className="arrow">→</em>
                        <span>{dayMeals.map((m: string) => ml[m] ?? m).join(', ')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="ft">
                <span>Page {3 + idx}</span>
                <span>{quote.quote_number}</span>
                <span>{companyName}</span>
              </div>
            </div>
          )
        })}

        {/* ── PRICING PAGE ── */}
        <div className="page pb">
          <div className="sec-bar">
            <div className="sec-pill">{t.pricing}</div>
            <div className="sec-line" />
            <div className="sec-end">{t.ourOffer}</div>
          </div>

          <div className="meta-grid meta-2" style={{ marginBottom: 22 }}>
            <div>
              <div className="meta-label">{t.tourLength}</div>
              <div className="meta-val">{durationStr}</div>
            </div>
            <div>
              <div className="meta-label">{t.traveler}</div>
              <div className="meta-val">{clientName}</div>
            </div>
          </div>

          <div className="incl-excl nb">
            <div className="incl">
              <div className="incl-hd">⊕ {t.included}</div>
              {includedLines.length > 0 ? (
                <p className="sm">
                  {includedLines.map((l: any, i: number) => (
                    <span key={l.id}>{l.description}{i < includedLines.length - 1 ? ', ' : ''}</span>
                  ))}
                </p>
              ) : (
                <p className="sm">{t.inclText}</p>
              )}
            </div>
            <div className="excl">
              <div className="excl-hd">⊖ {t.excluded}</div>
              <p className="sm">{t.exclText}</p>
            </div>
          </div>

          <h3 style={{ fontSize: 17 }}>{t.breakdown}</h3>

          {hasQuoteLevelPricing && (
            <table className="cost-tbl nb" style={{ marginBottom: 24 }}>
              <tbody>
                <tr>
                  <td>Total Cost Base</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>${fmt(costBase)}</td>
                  <td />
                </tr>
                {markupPercent > 0 && (
                  <>
                    <tr>
                      <td>Markup ({markupPercent}%)</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>${fmt(costBase * markupPercent / 100)}</td>
                      <td />
                    </tr>
                    <tr>
                      <td><strong>Total Client Price</strong></td>
                      <td />
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>${fmt(costBase * (1 + markupPercent / 100))}</td>
                    </tr>
                  </>
                )}
                {markupPercent === 0 && (
                  <tr>
                    <td><strong>Total Client Price</strong></td>
                    <td />
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>${fmt(costBase)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {!hasQuoteLevelPricing && travellerGroups.length > 0 && (
            <table className="cost-tbl nb">
              <thead>
                <tr>
                  <th>{isArabic ? 'المسافر' : 'Traveller'}</th>
                  <th style={{ textAlign: 'right' }}>{isArabic ? 'للشخص' : 'Per Person'}</th>
                  <th style={{ textAlign: 'right' }}>{isArabic ? 'الإجمالي' : 'Total'}</th>
                </tr>
              </thead>
              <tbody>
                {travellerGroups.map((g, i) => (
                  <tr key={i}>
                    <td>{g.count}x {g.name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {g.perPerson > 0 ? `$${fmt(g.perPerson)}` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {g.total > 0 ? `$${fmt(g.total)}` : '—'}
                    </td>
                  </tr>
                ))}
                <tr className="cost-total">
                  <td>{t.total}</td>
                  <td />
                  <td style={{ textAlign: 'right' }}>${fmt(totalSelling)}</td>
                </tr>
              </tbody>
            </table>
          )}

          {!hasQuoteLevelPricing && travellerGroups.length === 0 && (
            <table className="cost-tbl nb">
              <tbody>
                {sharingPp > 0 && (
                  <tr>
                    <td>{t.perSharing}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>${fmt(sharingPp)}</td>
                    <td />
                  </tr>
                )}
                {singlePp > 0 && (
                  <tr>
                    <td>{t.perSingle}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>${fmt(singlePp)}</td>
                    <td />
                  </tr>
                )}
                {totalSelling > 0 && (
                  <tr className="cost-total">
                    <td>{t.total}</td>
                    <td />
                    <td style={{ textAlign: 'right' }}>${fmt(totalSelling)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Confirm Booking button */}
          <a
            href={`mailto:${settings?.email ?? ''}?subject=Booking Confirmation - ${quote.quote_number}&body=I would like to confirm my booking for ${tourTitle}.`}
            className="confirm-btn no-print"
          >
            {isArabic ? 'تأكيد الحجز' : 'Confirm Booking'}
          </a>

          {/* Accommodation Packages section */}
          {optionalAccomLines.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 15 }}>{isArabic ? 'باقات الإقامة' : 'Accommodation Packages'}</h3>
              <p style={{ fontSize: 11, color: '#888', marginTop: -8, marginBottom: 12 }}>
                {isArabic ? 'يمكن إضافتها بسعر إضافي' : 'For more details see page 3-11'}
              </p>
              <table className="cost-tbl nb">
                <thead>
                  <tr>
                    <th>{isArabic ? 'الباقة' : 'Package'}</th>
                    <th style={{ textAlign: 'right' }}>{isArabic ? 'السعر الإضافي' : 'Additional Price'}</th>
                  </tr>
                </thead>
                <tbody>
                  {optionalAccomLines.map((line: any) => (
                    <tr key={line.id}>
                      <td>{line.description}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>${fmt(Number(line.total_selling_usd))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Other optional add-ons */}
          {otherOptionalLines.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: 15 }}>{t.optional}</h3>
              <table className="cost-tbl nb">
                <tbody>
                  {otherOptionalLines.map((line: any) => (
                    <tr key={line.id}>
                      <td>{line.description}</td>
                      <td style={{ color: '#888', fontSize: 11 }}>
                        {CATEGORY_LABELS[line.cost_category] ?? line.cost_category}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        ${fmt(Number(line.total_selling_usd))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {version.valid_until && (
            <p style={{ fontSize: 11, color: '#999', marginTop: 20 }}>{t.validUntil(fmtDate(version.valid_until))}</p>
          )}
          <div className="ft">
            <span>Page {3 + days.length}</span>
            <span>{quote.quote_number}</span>
            <span>{companyName}</span>
          </div>
        </div>

        {/* ── ABOUT / CONTACT PAGE ── */}
        <div className="page">
          <div className="sec-bar">
            <div className="sec-pill">{t.aboutUs}</div>
            <div className="sec-line" />
          </div>

          <h2 style={{ marginBottom: 6 }}>{companyName}</h2>
          <p style={{ fontSize: 13, color: '#555', marginBottom: 28, lineHeight: 1.65 }}>{t.aboutDesc}</p>

          <div className="contact-box">
            <h3 style={{ color: G, margin: '0 0 14px', fontSize: 14 }}>{t.contactUs}</h3>
            {settings?.address && (
              <div className="contact-row">
                <span className="contact-lbl">{t.address}</span>
                <span>{settings.address}</span>
              </div>
            )}
            {settings?.email && (
              <div className="contact-row">
                <span className="contact-lbl">{t.email}</span>
                <span>{settings.email}</span>
              </div>
            )}
            {settings?.phone && (
              <div className="contact-row">
                <span className="contact-lbl">{t.phone}</span>
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
            <span>Page {4 + days.length}</span>
            <span>{quote.quote_number}</span>
            <span>{companyName}</span>
          </div>
        </div>

      </div>
    </>
  )
}

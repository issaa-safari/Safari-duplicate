import type { ReactNode } from 'react'
import { ProposalPhoto as Photo } from './proposal-photo'
import { type ActivityGroup } from './activity-tabs'
import ItineraryMap, { type MapStop } from './itinerary-map'

// Client-facing tour proposal, styled to match the operator's PDF proposal.
// Presentational only — all data arrives as props so it can be rendered with
// mock data for visual QA and fed by the quote portal for real deliveries.

const LIME = '#A6CE39'
const BUSH = '#20271A'
const OLIVE = '#7A9A4A'
const INK = '#232821'

export type ProposalActivity = { name: string; moment?: string | null; optional?: boolean; description?: string | null }
export type ProposalAccommodation = { name: string; type?: string | null; room?: string | null; description?: string | null; photos: string[]; mapsUrl?: string | null }
export type ProposalDay = {
  key: string
  label: string                 // "Day 1" / "Day 4–5"
  date?: string | null
  destination?: string | null
  destinationMapsUrl?: string | null
  title: string
  description?: string | null
  heroPhoto?: string | null
  activities: ProposalActivity[]
  // Present for multi-night stops: activities split per sub-day → rendered as tabs.
  activityGroups?: ActivityGroup[]
  accommodation?: ProposalAccommodation | null
  // Scenic/destination photos (day photos) — shown in the right column,
  // distinct from the accommodation's own gallery in the left column.
  scenicPhotos?: string[]
  meals: string[]               // localized meal labels
}
export type SummaryRow = {
  dayLabel: string
  destination: string
  destinationMapsUrl?: string | null
  accommodation: string
  accommodationMeta?: string | null
  accommodationMapsUrl?: string | null
  meals: string
}
// "Tour Itinerary Map" section: pins for each stop with coordinates, plus a
// start → day/destination/accommodation → end table with per-leg distances.
export type RouteRow = { dayLabel: string; destination: string; destinationMapsUrl?: string | null; accommodation: string | null; accommodationMapsUrl?: string | null; distanceKm: number | null }
export type TourMapData = { stops: MapStop[]; rows: RouteRow[]; startPoint: string | null; endPoint: string | null }
export type TravellerGroup = { name: string; count: number; perPerson: number; total: number }

export type ProposalViewProps = {
  isArabic: boolean
  refNumber: string
  clientName: string
  clientFirstName: string
  title: string
  days: number
  nights: number
  travellersLabel: string
  startLabel: string
  endLabel: string
  validUntil?: string | null
  heroImage: string | null
  company: { name: string; logoUrl: string | null; email: string | null; phone: string | null; whatsapp: string | null; website: string | null }
  bank?: {
    accountName: string | null
    accountNumber: string | null
    bankName: string | null
    accountType: string | null
    depositPercent: number | null
  } | null
  agentName?: string | null
  summaryRows: SummaryRow[]
  /** Omitted/null when fewer than two stops have coordinates. */
  tourMap?: TourMapData | null
  arrivalNote?: string | null
  startDestination?: string | null
  itinerary: ProposalDay[]
  included: string[]
  excluded: string[]
  optional: { description: string; price: string }[]
  travellerGroups: TravellerGroup[]
  grandTotalLabel: string
  aboutText?: string | null
  status: { accepted: boolean; acceptedBy?: string | null; acceptedOn?: string | null; declined: boolean }
  acceptSlot?: ReactNode
  printHref: string
}

const T = (ar: boolean, en: string, arabic: string) => (ar ? arabic : en)

function Pill({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-0">
      <span
        className="relative z-10 inline-flex items-center rounded-full px-5 py-1.5 text-sm font-bold"
        style={{ background: LIME, color: BUSH, fontFamily: 'var(--font-display, sans-serif)' }}
      >
        {children}
      </span>
      <span className="-ml-3 h-8 flex-1 rounded-full border" style={{ borderColor: `${OLIVE}66` }} />
    </div>
  )
}

const svg = { fill: 'none', stroke: OLIVE, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
function PinIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" {...svg}><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.4" /></svg>
}
function HouseIcon() {
  return <svg viewBox="0 0 24 24" className="mt-0.5 h-7 w-7 shrink-0" {...svg} strokeWidth={1.5}><path d="M3 11l9-7 9 7" /><path d="M5 10v9h14v-9" /><path d="M9.5 19v-5h5v5" /></svg>
}
function ForkIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" {...svg}><path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11" /><path d="M17 3c-1.5 0-3 1.8-3 5s1.5 4 3 4M17 3v18" /></svg>
}

// Subtle "open in Google Maps" link shown next to accommodation/destination names.
function MapsLink({ href, ar }: { href?: string | null; ar: boolean }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-0.5 text-xs font-medium hover:underline"
      style={{ color: OLIVE }}
      title={T(ar, 'View on Google Maps', 'عرض على خرائط جوجل')}
    >
      <span aria-hidden="true">📍</span> {T(ar, 'Map', 'الخريطة')}
    </a>
  )
}

// Group a day's activities by their (already localized) moment label, keeping
// first-encounter order — activities arrive pre-sorted by the builder.
function groupByMoment(acts: ProposalActivity[]) {
  const order: string[] = []
  const map: Record<string, ProposalActivity[]> = {}
  for (const a of acts) {
    const key = a.moment || ''
    if (!(key in map)) { map[key] = []; order.push(key) }
    map[key].push(a)
  }
  return order.map((moment) => ({ moment, items: map[moment] }))
}

export default function ProposalView(p: ProposalViewProps) {
  const ar = p.isArabic
  const font = { fontFamily: 'var(--font-body, sans-serif)' }
  const display = { fontFamily: 'var(--font-display, sans-serif)' }

  return (
    <div dir={ar ? 'rtl' : 'ltr'} style={{ background: '#EDEBE4', ...font }} className="min-h-screen py-6 px-3 sm:px-4 text-[15px]" >
      <div className="mx-auto max-w-[820px] space-y-5">

        {/* ── Cover ─────────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-2xl shadow-sm" style={{ background: `linear-gradient(180deg, #262d20 0%, ${BUSH} 60%)` }}>
          <div className="px-6 pt-6 sm:px-9 sm:pt-9">
            {/* pill row */}
            <div className="mb-5 flex items-center justify-between rounded-full py-1 pl-1 pr-4" style={{ background: '#00000030', border: '1px solid #ffffff1a' }}>
              <span className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold" style={{ background: LIME, color: BUSH, ...display }}>
                {T(ar, 'Proposal', 'عرض سعر')}
              </span>
              <span className="text-xs text-white/70">
                {T(ar, 'Ref. Number', 'رقم المرجع')}: <span className="font-semibold text-white/90">{p.refNumber}</span>
              </span>
              <span className="hidden text-xs font-semibold uppercase tracking-wide text-white/90 sm:inline">{p.clientName}</span>
            </div>

            {/* info row */}
            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                [T(ar, 'Tour Length', 'مدة الرحلة'), `${p.days} ${T(ar, 'Days', 'أيام')} / ${p.nights} ${T(ar, 'Nights', 'ليالٍ')}`],
                [T(ar, 'Travelers', 'المسافرون'), p.travellersLabel],
                [T(ar, 'Start Tour', 'بداية الرحلة'), p.startLabel],
                [T(ar, 'End Tour', 'نهاية الرحلة'), p.endLabel],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg px-3 py-2" style={{ border: '1px solid #ffffff22' }}>
                  <p className="text-[10px] uppercase tracking-wide text-white/55">{k}</p>
                  <p className="text-sm font-semibold text-white">{v}</p>
                </div>
              ))}
            </div>

            {/* title */}
            <h1 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl" style={{ ...display, textWrap: 'balance' } as React.CSSProperties}>
              {p.title}
            </h1>

            {/* cover letter */}
            <div className="mb-7 rounded-2xl p-5 sm:p-6" style={{ background: '#00000038', border: '1px solid #ffffff14' }}>
              <p className="mb-3 font-semibold text-white" style={display}>
                {T(ar, `Dear ${p.clientFirstName},`, `عزيزي/عزيزتي ${p.clientFirstName}،`)}
              </p>
              <div className="space-y-2.5 text-sm leading-relaxed text-white/80">
                <p>{T(ar, 'Thank you for your inquiry.', 'شكراً لاستفساركم.')}</p>
                <p>{T(ar,
                  `It is our pleasure to send you this custom-made quote for our ${p.title} as per your request.`,
                  `يسعدنا أن نرسل لكم هذا العرض المخصص لرحلة "${p.title}" بناءً على طلبكم.`)}</p>
                <p>{T(ar,
                  'Please do not hesitate to contact us if you have any questions. We look forward to helping you plan your safari trip of a lifetime.',
                  'لا تترددوا في التواصل معنا لأي استفسار. نتطلع لمساعدتكم في تخطيط رحلة العمر.')}</p>
                <p className="text-white/60">{T(ar, 'Best regards', 'مع خالص التحية')}</p>
              </div>
              {/* signature */}
              <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-4" style={{ borderColor: '#ffffff1a' }}>
                <div className="flex items-center gap-3">
                  {p.company.logoUrl
                    ? <Photo src={p.company.logoUrl} alt={p.company.name} className="h-10 w-10 rounded-full" />
                    : <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: OLIVE }}>{p.company.name[0]}</span>}
                  <div className="text-sm">
                    {p.agentName && <p className="font-semibold text-white">{p.agentName}</p>}
                    <p className={p.agentName ? 'text-white/60' : 'font-semibold text-white'}>{p.company.name}</p>
                  </div>
                </div>
                <div className="text-xs text-white/70">
                  {p.company.phone && <p><span className="text-white/50">{T(ar, 'Phone', 'الهاتف')}</span> {p.company.phone}</p>}
                  {p.company.email && <p><span className="text-white/50">{T(ar, 'Email', 'البريد')}</span> {p.company.email}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* hero photo */}
          <Photo src={p.heroImage} alt={p.title} className="h-56 w-full sm:h-72" />

          {/* footer bar */}
          <div className="flex items-center justify-between bg-white px-6 py-3 sm:px-9">
            <div className="text-xs">
              <p className="font-semibold" style={{ color: INK }}>{p.company.name}</p>
              {p.company.website && <p className="text-gray-500">{p.company.website}</p>}
            </div>
            {p.company.logoUrl && <Photo src={p.company.logoUrl} alt="" className="h-7 w-7 rounded-full" />}
          </div>
        </section>

        {p.status.accepted && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-3">
            <p className="text-sm font-semibold text-green-800">{T(ar, 'Quote accepted', 'تم قبول العرض')}</p>
            {p.status.acceptedBy && <p className="text-xs text-green-600">{T(ar, 'Accepted by', 'تم القبول من قِبل')} {p.status.acceptedBy} · {p.status.acceptedOn}</p>}
          </div>
        )}
        {p.status.declined && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3">
            <p className="text-sm font-semibold text-red-800">{T(ar, 'Quote declined', 'تم رفض العرض')}</p>
          </div>
        )}

        {/* ── Summary ───────────────────────────────────────────── */}
        {p.summaryRows.length > 0 && (
          <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <Pill>{T(ar, 'Summary', 'الملخص')}</Pill>
            <div className="mt-5 flex items-center gap-4">
              <Photo src={p.heroImage} alt="" className="hidden h-16 w-24 shrink-0 rounded-lg sm:block" />
              <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: INK, ...display, textWrap: 'balance' } as React.CSSProperties}>{p.title}</h2>
            </div>

            <h3 className="mt-6 text-lg font-semibold" style={{ color: INK, ...display }}>{T(ar, 'Day by Day', 'يوماً بيوم')}</h3>
            {(p.arrivalNote || p.startDestination) && (
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                {p.arrivalNote && <p><span aria-hidden="true">✈ </span><span className="font-medium" style={{ color: OLIVE }}>{T(ar, 'Arrival', 'الوصول')}:</span> {p.arrivalNote}</p>}
                {p.startDestination && <p><span aria-hidden="true">◉ </span><span className="font-medium" style={{ color: OLIVE }}>{T(ar, 'Start Destination', 'وجهة البداية')}:</span> {p.startDestination}</p>}
              </div>
            )}

            <div className="mt-4 overflow-hidden rounded-xl border" style={{ borderColor: `${OLIVE}44` }}>
              <table className="stack-table proposal-stack w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ color: INK }}>
                    <th className="px-4 py-2.5 font-semibold" style={{ width: '15%' }}>{T(ar, 'Days', 'الأيام')}</th>
                    <th className="px-4 py-2.5 font-semibold" style={{ width: '25%' }}>{T(ar, 'Main Destination', 'الوجهة الرئيسية')}</th>
                    <th className="px-4 py-2.5 font-semibold" style={{ width: '35%' }}>{T(ar, 'Accommodation', 'الإقامة')}</th>
                    <th className="px-4 py-2.5 font-semibold" style={{ width: '25%' }}>{T(ar, 'Meal Plan', 'خطة الوجبات')}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.summaryRows.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 ? '#fff' : '#F7FAEE', borderTop: `1px solid ${OLIVE}22` }}>
                      <td data-label={T(ar, 'Days', 'الأيام')} className="px-4 py-3 font-semibold" style={{ color: OLIVE }}><span className="cell-v">{r.dayLabel}</span></td>
                      <td data-label={T(ar, 'Main Destination', 'الوجهة')} className="px-4 py-3 font-medium" style={{ color: INK }}>
                        <span className="cell-v">
                          {r.destination}
                          {r.destinationMapsUrl && <span className="ms-2"><MapsLink href={r.destinationMapsUrl} ar={ar} /></span>}
                        </span>
                      </td>
                      <td data-label={T(ar, 'Accommodation', 'الإقامة')} className="px-4 py-3" style={{ color: INK }}>
                        <span className="cell-v">
                          {r.accommodation}
                          {r.accommodationMapsUrl && <span className="ms-2"><MapsLink href={r.accommodationMapsUrl} ar={ar} /></span>}
                          {r.accommodationMeta && <span className="block text-xs text-gray-500">{r.accommodationMeta}</span>}
                        </span>
                      </td>
                      <td data-label={T(ar, 'Meal Plan', 'الوجبات')} className="px-4 py-3 text-gray-600"><span className="cell-v">{r.meals}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Tour itinerary map ────────────────────────────────── */}
        {p.tourMap && p.tourMap.stops.length >= 2 && (
          <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <Pill>{T(ar, 'Tour Itinerary Map', 'خريطة مسار الرحلة')}</Pill>

            <div className="mt-5">
              <ItineraryMap stops={p.tourMap.stops} />
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border" style={{ borderColor: `${OLIVE}44` }}>
              <table className="stack-table proposal-stack w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ color: INK }}>
                    <th className="px-4 py-2.5 font-semibold" style={{ width: '18%' }}>{T(ar, 'Days', 'الأيام')}</th>
                    <th className="px-4 py-2.5 font-semibold" style={{ width: '32%' }}>{T(ar, 'Destination', 'الوجهة')}</th>
                    <th className="px-4 py-2.5 font-semibold" style={{ width: '32%' }}>{T(ar, 'Accommodation', 'الإقامة')}</th>
                    <th className="px-4 py-2.5 font-semibold" style={{ width: '18%' }}>{T(ar, 'Distance', 'المسافة')}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.tourMap.startPoint && (
                    <tr style={{ background: '#F1F6E3', borderTop: `1px solid ${OLIVE}22` }}>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: OLIVE }} colSpan={3}>
                        {T(ar, 'Start Point', 'نقطة البداية')} · {p.tourMap.startPoint}
                      </td>
                      <td className="px-4 py-2.5" />
                    </tr>
                  )}
                  {p.tourMap.rows.map((r, i) => (
                    <tr key={i} style={{ background: i % 2 ? '#F7FAEE' : '#fff', borderTop: `1px solid ${OLIVE}22` }}>
                      <td data-label={T(ar, 'Days', 'الأيام')} className="px-4 py-2.5 font-semibold" style={{ color: OLIVE }}><span className="cell-v">{r.dayLabel}</span></td>
                      <td data-label={T(ar, 'Destination', 'الوجهة')} className="px-4 py-2.5 font-medium" style={{ color: INK }}>
                        <span className="cell-v">
                          {r.destination}
                          {r.destinationMapsUrl && <span className="ms-2"><MapsLink href={r.destinationMapsUrl} ar={ar} /></span>}
                        </span>
                      </td>
                      <td data-label={T(ar, 'Accommodation', 'الإقامة')} className="px-4 py-2.5" style={{ color: INK }}>
                        <span className="cell-v">
                          {r.accommodation ?? '—'}
                          {r.accommodationMapsUrl && <span className="ms-2"><MapsLink href={r.accommodationMapsUrl} ar={ar} /></span>}
                        </span>
                      </td>
                      <td data-label={T(ar, 'Distance', 'المسافة')} className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        <span className="cell-v">{r.distanceKm != null ? `~${Math.round(r.distanceKm)} ${T(ar, 'km', 'كم')}` : '—'}</span>
                      </td>
                    </tr>
                  ))}
                  {p.tourMap.endPoint && (
                    <tr style={{ background: '#F1F6E3', borderTop: `1px solid ${OLIVE}22` }}>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: OLIVE }} colSpan={3}>
                        {T(ar, 'End Point', 'نقطة النهاية')} · {p.tourMap.endPoint}
                      </td>
                      <td className="px-4 py-2.5" />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {T(ar,
                'Distances are approximate, measured between stops.',
                'المسافات تقريبية، مقاسة بين المحطات.')}
            </p>
          </section>
        )}

        {/* ── Day by day — magazine layout, one card per day ────── */}
        {p.itinerary.map((d) => {
          const groups = groupByMoment(d.activities)
          const hotelPhotos = d.accommodation?.photos ?? []
          const scenic = d.scenicPhotos ?? []
          const hasActs = d.activities.length > 0
          const hasActCard = hasActs || d.meals.length > 0
          const mealStr = d.meals.length > 1
            ? d.meals.slice(0, -1).join(ar ? '، ' : ', ') + (ar ? ' و ' : ' & ') + d.meals[d.meals.length - 1]
            : d.meals.join('')
          const accMeta = [d.accommodation?.type, d.accommodation?.room].filter(Boolean).join(' · ')

          return (
            <section key={d.key} className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
              {/* header: Day pill + location */}
              <div className="flex items-center justify-between gap-3 rounded-full border py-1 pl-1 pr-4" style={{ borderColor: `${OLIVE}55` }}>
                <span className="inline-flex items-center rounded-full px-5 py-1.5 text-sm font-bold text-white" style={{ background: `linear-gradient(90deg, ${OLIVE}, ${LIME})`, ...display }}>
                  {d.label}
                </span>
                {d.destination && (
                  <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: INK, ...display }}>
                    <PinIcon /> {d.destination}
                    {d.destinationMapsUrl && <MapsLink href={d.destinationMapsUrl} ar={ar} />}
                  </span>
                )}
              </div>

              <h2 className="mt-5 text-3xl font-bold sm:text-4xl" style={{ color: INK, ...display, textWrap: 'balance' } as React.CSSProperties}>
                {d.destination ?? d.title}
              </h2>

              <div className="mt-4 grid gap-6 md:grid-cols-2">
                {/* LEFT: intro · accommodation · hotel photos */}
                <div>
                  {d.description && <p className="text-sm leading-relaxed text-gray-600" style={{ textWrap: 'pretty' } as React.CSSProperties}>{d.description}</p>}

                  {d.accommodation && (
                    <>
                      <div className="mt-4 flex items-start gap-3 rounded-xl border px-3.5 py-3" style={{ borderColor: '#e2e2e2' }}>
                        <HouseIcon />
                        <div>
                          <p className="text-xs text-gray-400">{T(ar, 'Accommodation', 'الإقامة')} | {d.label}</p>
                          <p className="text-[15px] font-bold" style={{ color: INK, ...display }}>
                            {d.accommodation.name}
                            {d.accommodation.mapsUrl && <span className="ms-2 align-middle"><MapsLink href={d.accommodation.mapsUrl} ar={ar} /></span>}
                          </p>
                          {accMeta && <p className="text-xs capitalize text-gray-500">{accMeta}</p>}
                        </div>
                      </div>
                      {d.accommodation.description && <p className="mt-3 text-sm leading-relaxed text-gray-600">{d.accommodation.description}</p>}
                      {hotelPhotos.length > 0 && (
                        <div className="mt-3">
                          <div className="relative overflow-hidden rounded-xl">
                            <Photo src={hotelPhotos[0]} alt={d.accommodation.name} className="h-48 w-full" />
                            <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-gray-800 shadow">{d.accommodation.name}</span>
                          </div>
                          {hotelPhotos.length > 1 && (
                            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                              {hotelPhotos.slice(1, 3).map((src, pi) => (
                                <Photo key={pi} src={src} alt={d.accommodation!.name} className="h-24 w-full rounded-xl" />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* RIGHT: activities · meal plan · scenic photos */}
                <div>
                  {hasActCard && (
                    <div className="rounded-2xl p-5" style={{ background: '#F1F6E3', border: `1px solid ${OLIVE}33` }}>
                      {hasActs && (
                        <>
                          <p className="text-lg font-bold" style={{ color: INK, ...display }}>
                            {d.activities.length > 1 ? T(ar, 'Activities', 'الأنشطة') : T(ar, 'Activity', 'نشاط')}{' '}
                            <span className="font-normal text-gray-500">{d.label}</span>
                          </p>
                          {groups.map((g, gi) => (
                            <div key={gi} className={gi === 0 ? 'mt-3' : 'mt-4'}>
                              {g.moment && <p className="mb-1.5 text-sm font-bold" style={{ color: INK }}>{g.moment}</p>}
                              <ul className="space-y-2">
                                {g.items.map((a, ai) => (
                                  <li key={ai} className="flex gap-2 text-sm text-gray-700">
                                    <span aria-hidden="true" style={{ color: OLIVE }}>→</span>
                                    <span>
                                      <span className="font-semibold">{a.name}</span>
                                      {a.optional && <span className="text-amber-600"> · {T(ar, 'optional', 'اختياري')}</span>}
                                      {a.description && <span className="mt-0.5 block font-normal text-gray-500">{a.description}</span>}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </>
                      )}
                      {d.meals.length > 0 && (
                        <div className={hasActs ? 'mt-4 border-t pt-3.5' : ''} style={hasActs ? { borderColor: `${OLIVE}44` } : undefined}>
                          <p className="flex items-center gap-1.5 text-sm font-bold" style={{ color: INK, ...display }}>
                            <ForkIcon /> {T(ar, 'Meal Plan', 'خطة الوجبات')} — {d.label}
                          </p>
                          <p className="mt-1 flex gap-2 text-sm text-gray-700"><span aria-hidden="true" style={{ color: OLIVE }}>→</span><span>{mealStr}</span></p>
                        </div>
                      )}
                    </div>
                  )}

                  {scenic.length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      {scenic.map((src, i) => (
                        <div key={i} className="relative overflow-hidden rounded-xl">
                          <Photo src={src} alt={d.destination ?? ''} className={i === 0 ? 'h-48 w-full' : 'h-40 w-full'} />
                          {d.destination && <span className="absolute bottom-0 left-0 rounded-tr-lg bg-black/70 px-3 py-1 text-[11px] font-semibold text-white">{d.destination}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )
        })}

        {/* ── Pricing ───────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <Pill>{T(ar, 'Pricing', 'التسعير')}</Pill>

          <div className="mt-5 grid gap-4 rounded-xl border p-5 sm:grid-cols-2" style={{ borderColor: `${OLIVE}44` }}>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-bold" style={{ color: INK, ...display }}>
                <span style={{ color: OLIVE }}>⊕</span> {T(ar, 'Included', 'مشمول')}
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                {p.included.map((x, i) => <li key={i} className="flex gap-2"><span style={{ color: OLIVE }}>·</span>{x}</li>)}
              </ul>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-bold" style={{ color: INK, ...display }}>
                <span className="text-red-500">⊖</span> {T(ar, 'Excluded', 'غير مشمول')}
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                {p.excluded.map((x, i) => <li key={i} className="flex gap-2"><span className="text-red-400">·</span>{x}</li>)}
              </ul>
            </div>
          </div>

          {p.travellerGroups.length > 0 && (
            <>
              <h3 className="mt-6 text-lg font-semibold" style={{ color: INK, ...display }}>{T(ar, 'Breakdown of Costs', 'تفصيل التكاليف')}</h3>
              <div className="mt-3 overflow-hidden rounded-xl border" style={{ borderColor: `${OLIVE}44` }}>
                <table className="stack-table w-full text-sm">
                  <tbody>
                    {p.travellerGroups.map((g, i) => (
                      <tr key={i} style={{ background: i % 2 ? '#fff' : '#F7FAEE', borderTop: i ? `1px solid ${OLIVE}22` : undefined }}>
                        <td className="px-4 py-3 font-medium" style={{ color: INK }}>{g.count}× {g.name}</td>
                        <td data-label={T(ar, 'Per person', 'للشخص')} className="px-4 py-3 text-right text-gray-600">{g.perPerson > 0 ? `$${g.perPerson.toLocaleString()}` : '—'}</td>
                        <td data-label={T(ar, 'Total', 'الإجمالي')} className="px-4 py-3 text-right font-semibold" style={{ color: INK }}>{g.total > 0 ? `$${g.total.toLocaleString()}` : '—'}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#F1F6E3', borderTop: `2px solid ${OLIVE}` }}>
                      <td className="px-4 py-3 text-base font-bold" style={{ color: INK }} colSpan={2}>{T(ar, 'Total in USD', 'الإجمالي بالدولار')}</td>
                      <td className="px-4 py-3 text-right text-base font-bold" style={{ color: INK }}>{p.grandTotalLabel}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          {p.optional.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{T(ar, 'Optional add-ons', 'إضافات اختيارية')}</p>
              <div className="rounded-xl border" style={{ borderColor: `${OLIVE}33` }}>
                {p.optional.map((o, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm" style={{ borderTop: i ? `1px solid ${OLIVE}18` : undefined }}>
                    <span className="text-gray-700">{o.description}</span>
                    <span className="font-semibold" style={{ color: INK }}>{o.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {p.acceptSlot && <div className="mt-6">{p.acceptSlot}</div>}
        </section>

        {/* ── Payment details ───────────────────────────────────── */}
        {p.bank && (p.bank.accountNumber || p.bank.bankName) && (
          <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <Pill>{T(ar, 'Payment Details', 'تفاصيل الدفع')}</Pill>
            <h2 className="mt-5 text-2xl font-bold" style={{ color: INK, ...display }}>
              {T(ar, 'How to pay', 'كيفية الدفع')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              {p.bank.depositPercent
                ? T(
                    ar,
                    `A deposit of ${p.bank.depositPercent}% confirms your booking; the balance is due before travel. Pay by bank transfer using the details below.`,
                    `يؤكد دفع عربون بنسبة ${p.bank.depositPercent}٪ حجزك، ويستحق الرصيد المتبقي قبل السفر. ادفع عبر التحويل البنكي باستخدام التفاصيل أدناه.`
                  )
                : T(
                    ar,
                    'Pay by bank transfer using the details below, then send us your transfer confirmation.',
                    'ادفع عبر التحويل البنكي باستخدام التفاصيل أدناه، ثم أرسل لنا تأكيد التحويل.'
                  )}
            </p>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {p.bank.bankName && (
                <div>
                  <dt className="text-gray-500">{T(ar, 'Bank', 'البنك')}</dt>
                  <dd className="font-semibold" style={{ color: INK }}>{p.bank.bankName}</dd>
                </div>
              )}
              {p.bank.accountName && (
                <div>
                  <dt className="text-gray-500">{T(ar, 'Account name', 'اسم الحساب')}</dt>
                  <dd className="font-semibold" style={{ color: INK }}>{p.bank.accountName}</dd>
                </div>
              )}
              {p.bank.accountNumber && (
                <div>
                  <dt className="text-gray-500">{T(ar, 'Account number', 'رقم الحساب')}</dt>
                  <dd className="font-semibold tabular-nums" style={{ color: INK }}>{p.bank.accountNumber}</dd>
                </div>
              )}
              {p.bank.accountType && (
                <div>
                  <dt className="text-gray-500">{T(ar, 'Account type', 'نوع الحساب')}</dt>
                  <dd className="font-semibold" style={{ color: INK }}>{p.bank.accountType}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {/* ── About ─────────────────────────────────────────────── */}
        {p.aboutText && (
          <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <Pill>{T(ar, 'About Us', 'من نحن')}</Pill>
            <h2 className="mt-5 text-2xl font-bold" style={{ color: INK, ...display }}>{p.company.name}</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600" style={{ textWrap: 'pretty' } as React.CSSProperties}>{p.aboutText}</p>
          </section>
        )}

        {/* contact + print */}
        <div className="flex flex-col items-center gap-2 pb-4 text-center text-sm text-gray-500">
          <p>
            {[p.company.email, p.company.phone && `${T(ar, 'Phone', 'هاتف')}: ${p.company.phone}`, p.company.whatsapp && `WhatsApp: ${p.company.whatsapp}`]
              .filter(Boolean).join('  ·  ')}
          </p>
          <a href={p.printHref} target="_blank" rel="noopener noreferrer" className="text-xs font-medium underline" style={{ color: OLIVE }}>
            {T(ar, 'Download PDF', 'تحميل PDF')}
          </a>
        </div>
      </div>
    </div>
  )
}

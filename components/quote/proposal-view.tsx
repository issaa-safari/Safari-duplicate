import type { ReactNode } from 'react'
import { ProposalPhoto as Photo } from './proposal-photo'
import ActivityTabs, { type ActivityGroup } from './activity-tabs'
import ItineraryMap, { type MapStop } from './itinerary-map'

// Client-facing tour proposal, styled to match the operator's PDF proposal.
// Presentational only — all data arrives as props so it can be rendered with
// mock data for visual QA and fed by the quote portal for real deliveries.

const LIME = '#A6CE39'
const BUSH = '#20271A'
const OLIVE = '#7A9A4A'
const INK = '#232821'

export type ProposalActivity = { name: string; moment?: string | null; optional?: boolean; description?: string | null }
export type ProposalAccommodation = { name: string; type?: string | null; room?: string | null; description?: string | null; photos: string[] }
export type ProposalDay = {
  key: string
  label: string                 // "Day 1" / "Day 4–5"
  date?: string | null
  destination?: string | null
  title: string
  description?: string | null
  heroPhoto?: string | null
  activities: ProposalActivity[]
  // Present for multi-night stops: activities split per sub-day → rendered as tabs.
  activityGroups?: ActivityGroup[]
  accommodation?: ProposalAccommodation | null
  meals: string[]               // localized meal labels
}
export type SummaryRow = { dayLabel: string; destination: string; accommodation: string; accommodationMeta?: string | null; meals: string }
// "Tour Itinerary Map" section: pins for each stop with coordinates, plus a
// start → day/destination/accommodation → end table with per-leg distances.
export type RouteRow = { dayLabel: string; destination: string; accommodation: string | null; distanceKm: number | null }
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
              <table className="stack-table w-full text-sm">
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
                      <td data-label={T(ar, 'Days', 'الأيام')} className="px-4 py-3 font-semibold" style={{ color: OLIVE }}>{r.dayLabel}</td>
                      <td data-label={T(ar, 'Main Destination', 'الوجهة')} className="px-4 py-3 font-medium" style={{ color: INK }}>{r.destination}</td>
                      <td data-label={T(ar, 'Accommodation', 'الإقامة')} className="px-4 py-3" style={{ color: INK }}>
                        {r.accommodation}
                        {r.accommodationMeta && <span className="block text-xs text-gray-500">{r.accommodationMeta}</span>}
                      </td>
                      <td data-label={T(ar, 'Meal Plan', 'الوجبات')} className="px-4 py-3 text-gray-600">{r.meals}</td>
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
              <table className="stack-table w-full text-sm">
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
                      <td data-label={T(ar, 'Days', 'الأيام')} className="px-4 py-2.5 font-semibold" style={{ color: OLIVE }}>{r.dayLabel}</td>
                      <td data-label={T(ar, 'Destination', 'الوجهة')} className="px-4 py-2.5 font-medium" style={{ color: INK }}>{r.destination}</td>
                      <td data-label={T(ar, 'Accommodation', 'الإقامة')} className="px-4 py-2.5" style={{ color: INK }}>{r.accommodation ?? '—'}</td>
                      <td data-label={T(ar, 'Distance', 'المسافة')} className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {r.distanceKm != null ? `~${Math.round(r.distanceKm)} ${T(ar, 'km', 'كم')}` : '—'}
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

        {/* ── Day by day ────────────────────────────────────────── */}
        {p.itinerary.map((d) => (
          <section key={d.key} className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <Pill>{d.label}</Pill>
            <div className="mt-5 overflow-hidden rounded-xl">
              <div className="relative">
                <Photo src={d.heroPhoto} alt={d.destination ?? d.title} className="h-52 w-full sm:h-64" />
                {d.destination && (
                  <span className="absolute bottom-3 left-3 rounded-md bg-black/55 px-2.5 py-1 text-xs font-medium text-white">{d.destination}</span>
                )}
              </div>
            </div>

            <h2 className="mt-5 text-2xl font-bold sm:text-3xl" style={{ color: INK, ...display }}>{d.destination ?? d.title}</h2>

            <div className="mt-3 grid gap-5 sm:grid-cols-[1fr_240px]">
              <div className="text-sm leading-relaxed text-gray-600" style={{ textWrap: 'pretty' } as React.CSSProperties}>
                {d.description
                  ? <p>{d.description}</p>
                  : <p className="text-gray-400">{d.title}</p>}
              </div>
              {d.activityGroups && d.activityGroups.length > 0 ? (
                <ActivityTabs
                  groups={d.activityGroups}
                  isArabic={ar}
                  heading={`${T(ar, 'Activity', 'الأنشطة')} ${d.label}`}
                />
              ) : d.activities.length > 0 ? (
                <aside className="self-start rounded-xl p-4" style={{ border: `1px solid ${OLIVE}44`, background: '#F7FAEE' }}>
                  <p className="mb-2 text-sm font-bold" style={{ color: INK, ...display }}>
                    {T(ar, 'Activity', 'الأنشطة')} <span className="font-normal text-gray-500">{d.label}</span>
                  </p>
                  <ul className="space-y-1.5">
                    {d.activities.map((a, ai) => (
                      <li key={ai} className="flex gap-2 text-sm text-gray-700">
                        <span aria-hidden="true" style={{ color: OLIVE }}>→</span>
                        <span>
                          {a.name}
                          {a.moment && <span className="text-gray-400"> · {a.moment}</span>}
                          {a.optional && <span className="text-amber-600"> · {T(ar, 'optional', 'اختياري')}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </aside>
              ) : null}
            </div>

            {/* accommodation block */}
            {d.accommodation && (
              <div className="mt-6">
                <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2" style={{ border: `1px solid ${OLIVE}44` }}>
                  <span aria-hidden="true" style={{ color: OLIVE }}>⌂</span>
                  <span className="text-xs text-gray-500">{T(ar, 'Accommodation', 'الإقامة')} · {d.label}</span>
                  <span className="text-sm font-bold" style={{ color: INK, ...display }}>{d.accommodation.name}</span>
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_260px]">
                  <div className="text-sm leading-relaxed text-gray-600">
                    {d.accommodation.type && <p className="mb-1 text-xs uppercase tracking-wide text-gray-400">{d.accommodation.type}{d.accommodation.room ? ` · ${d.accommodation.room}` : ''}</p>}
                    {d.accommodation.description && <p>{d.accommodation.description}</p>}
                  </div>
                  {d.accommodation.photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {d.accommodation.photos.slice(0, 4).map((src, pi) => (
                        <Photo key={pi} src={src} alt={d.accommodation!.name} className="h-24 w-full rounded-lg" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {d.meals.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {d.meals.map((m) => (
                  <span key={m} className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: '#F7FAEE', color: OLIVE, border: `1px solid ${OLIVE}33` }}>{m}</span>
                ))}
              </div>
            )}
          </section>
        ))}

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

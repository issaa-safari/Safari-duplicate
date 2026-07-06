// Shared proposal renderer used by the admin Preview step. Renders the sections
// in the given order under the chosen theme, from a normalized data shape.

export type SectionKey = 'cover' | 'itinerary' | 'inclusions' | 'pricing'
export const DEFAULT_SECTIONS: SectionKey[] = ['cover', 'itinerary', 'inclusions', 'pricing']

export interface ProposalDay {
  day_number: number
  title: string | null
  description_en: string | null
  meals: string[] | null
  items: { item_type: string; title_snapshot: string }[]
}

export interface ProposalData {
  title: string
  companyName: string
  clientName: string
  travelStart: string | null
  travelEnd: string | null
  perPerson: number | null
  currency: string
  days: ProposalDay[]
  inclusions: string | null
  exclusions: string | null
  priceLines: { description: string; quantity: number; total: number }[]
  total: number
}

const THEMES: Record<string, { wrap: string; head: string; accent: string; rule: string }> = {
  classic: { wrap: 'font-serif bg-[#fffdf8] text-[#23261d]', head: 'text-[#43502a]', accent: 'text-[#5c6b3c]', rule: 'border-[#e3ddcd]' },
  modern:  { wrap: 'font-sans bg-white text-slate-800',       head: 'text-slate-900',  accent: 'text-slate-600',  rule: 'border-slate-200' },
  safari:  { wrap: 'font-serif bg-[#f6efe2] text-[#3b3323]',  head: 'text-[#7a5a1e]',  accent: 'text-[#9a6a1e]',  rule: 'border-[#e6d8bf]' },
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
}
function money(n: number, c: string) {
  return `${c === 'USD' ? '$' : c + ' '}${Number(n).toLocaleString()}`
}

export default function ProposalView({
  data, order = DEFAULT_SECTIONS, theme = 'classic',
}: {
  data: ProposalData
  order?: SectionKey[]
  theme?: string
}) {
  const t = THEMES[theme] ?? THEMES.classic

  const sections: Record<SectionKey, React.ReactNode> = {
    cover: (
      <section key="cover" className={`border-b ${t.rule} pb-6 mb-6`}>
        <p className={`text-xs uppercase tracking-widest ${t.accent} mb-2`}>{data.companyName}</p>
        <h1 className={`text-3xl font-semibold ${t.head} mb-2`} style={{ textWrap: 'balance' }}>{data.title}</h1>
        <p className="text-sm opacity-70">Prepared for {data.clientName || 'our guest'}</p>
        {(data.travelStart || data.travelEnd) && (
          <p className="text-sm opacity-70 mt-1">{fmtDate(data.travelStart)}{data.travelEnd ? ` – ${fmtDate(data.travelEnd)}` : ''}</p>
        )}
        {data.perPerson != null && data.perPerson > 0 && (
          <p className={`mt-4 text-lg font-semibold ${t.accent}`}>{money(data.perPerson, data.currency)} <span className="text-sm font-normal opacity-70">per person</span></p>
        )}
      </section>
    ),
    itinerary: (
      <section key="itinerary" className="mb-6">
        <h2 className={`text-lg font-semibold ${t.head} mb-3`}>Day by day</h2>
        <div className="space-y-4">
          {data.days.length === 0 && <p className="text-sm opacity-60">No itinerary days yet.</p>}
          {data.days.map(d => (
            <div key={d.day_number} className={`border-l-2 ${t.rule} pl-4`}>
              <p className={`text-sm font-semibold ${t.accent}`}>Day {d.day_number}{d.title ? ` · ${d.title}` : ''}</p>
              {d.description_en && <p className="text-sm opacity-80 mt-1 whitespace-pre-wrap">{d.description_en}</p>}
              {d.items.length > 0 && (
                <p className="text-xs opacity-60 mt-1">{d.items.map(i => i.title_snapshot).join(' · ')}</p>
              )}
              {d.meals && d.meals.length > 0 && <p className="text-xs opacity-60 mt-0.5">Meals: {d.meals.join(', ')}</p>}
            </div>
          ))}
        </div>
      </section>
    ),
    inclusions: (
      <section key="inclusions" className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h2 className={`text-sm font-semibold ${t.head} mb-2`}>What's included</h2>
          <p className="text-sm opacity-80 whitespace-pre-wrap">{data.inclusions || '—'}</p>
        </div>
        <div>
          <h2 className={`text-sm font-semibold ${t.head} mb-2`}>What's excluded</h2>
          <p className="text-sm opacity-80 whitespace-pre-wrap">{data.exclusions || '—'}</p>
        </div>
      </section>
    ),
    pricing: (
      <section key="pricing" className="mb-2">
        <h2 className={`text-lg font-semibold ${t.head} mb-3`}>Pricing</h2>
        <table className="w-full text-sm">
          <tbody>
            {data.priceLines.map((l, i) => (
              <tr key={i} className={`border-b ${t.rule}`}>
                <td className="py-2">{l.description}</td>
                <td className="py-2 text-right opacity-70">× {l.quantity}</td>
                <td className="py-2 text-right font-medium tabular-nums">{money(l.total, data.currency)}</td>
              </tr>
            ))}
            <tr>
              <td className={`py-2 font-semibold ${t.head}`} colSpan={2}>Total</td>
              <td className={`py-2 text-right font-semibold tabular-nums ${t.head}`}>{money(data.total, data.currency)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    ),
  }

  return (
    <div className={`rounded-lg border ${t.rule} ${t.wrap} p-8 max-w-2xl mx-auto`}>
      {order.map(key => sections[key])}
    </div>
  )
}

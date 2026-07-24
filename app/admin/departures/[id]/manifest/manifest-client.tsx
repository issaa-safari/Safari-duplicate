'use client'

import { useMemo, useState } from 'react'
import { useAction } from '@/lib/hooks/use-action'
import { Button } from '@/components/ui/button'
import type { Motorbike } from '@/lib/types'
import {
  addTravellerFlight, deleteTravellerFlight, assignMotorbike,
  updateTravellerExtras, generateAgreement, generateAllAgreements,
} from './actions'

export interface RosterFlight {
  id: string
  direction: string
  flightNumber: string | null
  airline: string | null
  scheduledAt: string | null
  airport: string | null
  notes: string | null
}

export interface RosterTraveller {
  id: string
  bookingId: string
  partyName: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  nationality: string | null
  passportNumber: string | null
  isRider: boolean
  dietary: string | null
  allergies: string | null
  emergency: string | null
  motorbikeId: string | null
  motorbikeName: string | null
  flights: RosterFlight[]
  agreement: { status: string; token: string | null; signedName: string | null; signedAt: string | null } | null
}

const inputCls = 'w-full rounded-md border border-border px-2.5 py-1.5 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

function fullName(t: RosterTraveller) {
  return `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || '(unnamed traveller)'
}
function firstArrival(t: RosterTraveller): RosterFlight | null {
  return t.flights.find(f => f.direction === 'arrival' && f.scheduledAt) ?? t.flights.find(f => f.direction === 'arrival') ?? null
}
function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function ReadinessBar({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const complete = done >= total && total > 0
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`text-xs font-semibold ${complete ? 'text-green-600' : 'text-foreground'}`}>{done}/{total}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${complete ? 'bg-green-500' : 'bg-primary-strong'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function ManifestClient({
  departureId, departureLabel, roster, motorbikes, hasTemplate, agreementBaseUrl,
}: {
  departureId: string
  departureLabel: string
  roster: RosterTraveller[]
  motorbikes: Motorbike[]
  hasTemplate: boolean
  agreementBaseUrl: string
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [windowMin, setWindowMin] = useState(90)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState('')
  const { pending, run } = useAction()

  const riders = roster.filter(t => t.isRider)
  const readiness = useMemo(() => ({
    flights: roster.filter(t => t.flights.some(f => f.direction === 'arrival')).length,
    bikes: riders.filter(t => t.motorbikeId).length,
    agreements: roster.filter(t => t.agreement?.status === 'signed').length,
    passports: roster.filter(t => t.passportNumber).length,
  }), [roster, riders])

  // Bikes already taken by someone else (across this departure) — greyed in selects.
  const takenBikeIds = useMemo(() => {
    const m: Record<string, string> = {}
    for (const t of roster) if (t.motorbikeId) m[t.motorbikeId] = t.id
    return m
  }, [roster])

  // Group travellers into transfer runs by arrival time (within `windowMin`).
  const transferRuns = useMemo(() => {
    const withArrival = roster
      .map(t => ({ t, at: firstArrival(t)?.scheduledAt ?? null }))
      .filter(x => x.at) as { t: RosterTraveller; at: string }[]
    withArrival.sort((a, b) => a.at.localeCompare(b.at))
    const runs: { start: string; end: string; travellers: RosterTraveller[] }[] = []
    for (const { t, at } of withArrival) {
      const last = runs[runs.length - 1]
      if (last && new Date(at).getTime() - new Date(last.start).getTime() <= windowMin * 60_000) {
        last.travellers.push(t); last.end = at
      } else {
        runs.push({ start: at, end: at, travellers: [t] })
      }
    }
    const noArrival = roster.filter(t => !firstArrival(t)?.scheduledAt)
    return { runs, noArrival }
  }, [roster, windowMin])

  function copyLink(token: string) {
    const url = agreementBaseUrl + token
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(token); setTimeout(() => setCopied(null), 1500)
    })
  }

  function exportCsv() {
    const head = ['Name', 'Party', 'Role', 'Motorbike', 'Arrival flight', 'Arrival time', 'Arrival airport',
      'Departure flight', 'Passport', 'Nationality', 'Phone', 'Dietary', 'Allergies', 'Emergency', 'Agreement']
    const rows = roster.map(t => {
      const arr = t.flights.find(f => f.direction === 'arrival')
      const dep = t.flights.find(f => f.direction === 'departure')
      return [
        fullName(t), t.partyName, t.isRider ? 'Rider' : 'Passenger', t.motorbikeName ?? '',
        [arr?.airline, arr?.flightNumber].filter(Boolean).join(' '), arr?.scheduledAt ? fmtTime(arr.scheduledAt) : '',
        arr?.airport ?? '', [dep?.airline, dep?.flightNumber].filter(Boolean).join(' '),
        t.passportNumber ?? '', t.nationality ?? '', t.phone ?? '',
        t.dietary ?? '', t.allergies ?? '', t.emergency ?? '', t.agreement?.status ?? 'none',
      ]
    })
    const csv = [head, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `manifest-${departureLabel.replace(/[^\w]+/g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (roster.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center">
        <p className="text-sm text-muted-foreground">No travellers booked on this departure yet.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Travellers appear here once bookings are confirmed against this departure.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error} <button onClick={() => setError('')} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Readiness */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Readiness · {roster.length} traveller{roster.length !== 1 ? 's' : ''}</h2>
          <div className="flex gap-2">
            {hasTemplate && (
              <Button size="sm" variant="secondary" loading={pending} loadingText="Issuing…"
                onClick={() => { setError(''); const fd = new FormData(); fd.set('departureId', departureId); run(async () => { try { await generateAllAgreements(fd) } catch (e) { setError(e instanceof Error ? e.message : 'Failed.') } }) }}>
                Issue all agreements
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={exportCsv}>Export CSV</Button>
            <Button size="sm" variant="secondary" onClick={() => window.print()}>Print</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ReadinessBar label="Arrival flights" done={readiness.flights} total={roster.length} />
          <ReadinessBar label="Bikes assigned" done={readiness.bikes} total={riders.length} />
          <ReadinessBar label="Agreements signed" done={readiness.agreements} total={roster.length} />
          <ReadinessBar label="Passports on file" done={readiness.passports} total={roster.length} />
        </div>
      </div>

      {/* Transfer runs */}
      <div className="rounded-xl border border-border bg-surface shadow-sm p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Airport transfer runs</h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Group arrivals within
            <select value={windowMin} onChange={e => setWindowMin(Number(e.target.value))}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs">
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
            </select>
          </label>
        </div>
        {transferRuns.runs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No arrival times recorded yet — add arrival flights below.</p>
        ) : (
          <div className="space-y-3">
            {transferRuns.runs.map((run, i) => (
              <div key={i} className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs font-semibold text-brand-text">
                  Run {i + 1} · {fmtTime(run.start)}{run.end !== run.start ? ` – ${new Date(run.end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  <span className="ml-2 font-normal text-muted-foreground">{run.travellers.length} pax</span>
                </p>
                <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground">
                  {run.travellers.map(t => {
                    const a = firstArrival(t)
                    return (
                      <li key={t.id}>
                        {fullName(t)}
                        <span className="text-muted-foreground"> · {[a?.airline, a?.flightNumber].filter(Boolean).join(' ') || 'flight'}{a?.airport ? ` → ${a.airport}` : ''}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
            {transferRuns.noArrival.length > 0 && (
              <p className="text-xs text-muted-foreground">
                No arrival time: {transferRuns.noArrival.map(fullName).join(', ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Roster */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <table className="stack-table w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Traveller</th>
              <th className="px-4 py-3 font-medium">Arrival</th>
              <th className="px-4 py-3 font-medium">Motorbike</th>
              <th className="px-4 py-3 font-medium">Agreement</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {roster.map(t => {
              const arr = firstArrival(t)
              const isOpen = expanded === t.id
              return (
                <RosterRow
                  key={t.id}
                  t={t} arr={arr} isOpen={isOpen}
                  onToggle={() => setExpanded(isOpen ? null : t.id)}
                  departureId={departureId}
                  motorbikes={motorbikes}
                  takenBikeIds={takenBikeIds}
                  hasTemplate={hasTemplate}
                  copied={copied}
                  onCopy={copyLink}
                  onError={setError}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AgreementCell({ t, copied, onCopy }: { t: RosterTraveller; copied: string | null; onCopy: (token: string) => void }) {
  if (!t.agreement) return <span className="text-xs text-muted-foreground">Not issued</span>
  if (t.agreement.status === 'signed') {
    return (
      <span className="text-xs font-medium text-green-600">
        ✓ Signed{t.agreement.signedAt ? ` · ${new Date(t.agreement.signedAt).toLocaleDateString('en-GB')}` : ''}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-2">
      <span className="text-xs font-medium text-amber-600">Pending</span>
      {t.agreement.token && (
        <button onClick={() => onCopy(t.agreement!.token!)} className="text-xs text-brand-text hover:underline">
          {copied === t.agreement.token ? 'Copied!' : 'Copy link'}
        </button>
      )}
    </span>
  )
}

function RosterRow({
  t, arr, isOpen, onToggle, departureId, motorbikes, takenBikeIds, hasTemplate, copied, onCopy, onError,
}: {
  t: RosterTraveller
  arr: RosterFlight | null
  isOpen: boolean
  onToggle: () => void
  departureId: string
  motorbikes: Motorbike[]
  takenBikeIds: Record<string, string>
  hasTemplate: boolean
  copied: string | null
  onCopy: (token: string) => void
  onError: (msg: string) => void
}) {
  const { pending, run } = useAction()
  const [showAddFlight, setShowAddFlight] = useState(false)

  function act(fn: () => Promise<void>) {
    onError('')
    run(async () => { try { await fn() } catch (e) { onError(e instanceof Error ? e.message : 'Action failed.') } })
  }

  function handleBike(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData(); fd.set('departureId', departureId); fd.set('travellerId', t.id); fd.set('motorbikeId', e.target.value)
    act(() => assignMotorbike(fd))
  }
  function handleAddFlight(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form); fd.set('departureId', departureId); fd.set('travellerId', t.id)
    act(async () => { await addTravellerFlight(fd); form.reset(); setShowAddFlight(false) })
  }
  function handleExtras(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget); fd.set('departureId', departureId); fd.set('travellerId', t.id)
    act(() => updateTravellerExtras(fd))
  }

  return (
    <>
      <tr className="border-b border-border/70 align-top hover:bg-muted/40">
        <td data-label="Traveller" className="px-4 py-3">
          <button onClick={onToggle} className="text-left">
            <span className="font-medium text-foreground">{fullName(t)}</span>
            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase ${t.isRider ? 'bg-primary/10 text-brand-text' : 'bg-muted text-muted-foreground'}`}>
              {t.isRider ? 'Rider' : 'Pax'}
            </span>
          </button>
          <p className="text-xs text-muted-foreground mt-0.5">{t.partyName}{t.nationality ? ` · ${t.nationality}` : ''}</p>
        </td>
        <td data-label="Arrival" className="px-4 py-3 text-muted-foreground">
          {arr ? (
            <>
              <span className="text-foreground">{[arr.airline, arr.flightNumber].filter(Boolean).join(' ') || 'Flight'}</span>
              <span className="block text-xs">{fmtTime(arr.scheduledAt)}{arr.airport ? ` · ${arr.airport}` : ''}</span>
            </>
          ) : <span className="text-xs">—</span>}
        </td>
        <td data-label="Motorbike" className="px-4 py-3">
          {t.isRider ? (
            <select value={t.motorbikeId ?? ''} onChange={handleBike} disabled={pending}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs max-w-[11rem]">
              <option value="">— Unassigned —</option>
              {motorbikes.map(b => {
                const takenByOther = takenBikeIds[b.id] && takenBikeIds[b.id] !== t.id
                return (
                  <option key={b.id} value={b.id} disabled={!!takenByOther}>
                    {b.name}{b.plate_number ? ` (${b.plate_number})` : ''}{takenByOther ? ' — taken' : ''}
                  </option>
                )
              })}
            </select>
          ) : <span className="text-xs text-muted-foreground">Passenger</span>}
        </td>
        <td data-label="Agreement" className="px-4 py-3">
          <AgreementCell t={t} copied={copied} onCopy={onCopy} />
          {hasTemplate && t.agreement?.status !== 'signed' && (
            <button
              onClick={() => { const fd = new FormData(); fd.set('departureId', departureId); fd.set('travellerId', t.id); act(() => generateAgreement(fd)) }}
              disabled={pending}
              className="block text-xs text-brand-text hover:underline mt-0.5">
              {t.agreement ? 'Re-issue' : 'Generate'}
            </button>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <button onClick={onToggle} className="text-xs text-brand-text hover:underline">{isOpen ? 'Close' : 'Details'}</button>
        </td>
      </tr>

      {isOpen && (
        <tr className="border-b border-border/70 bg-muted/20">
          <td colSpan={5} className="px-4 py-4">
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Flights */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flights</h3>
                  {!showAddFlight && (
                    <button onClick={() => setShowAddFlight(true)} className="text-xs text-brand-text hover:underline">+ Add flight</button>
                  )}
                </div>
                {t.flights.length === 0 && !showAddFlight && <p className="text-xs text-muted-foreground">No flights recorded.</p>}
                <ul className="space-y-1.5 mb-2">
                  {t.flights.map(f => (
                    <li key={f.id} className="flex items-start gap-2 text-xs">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase shrink-0 ${f.direction === 'departure' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {f.direction === 'departure' ? '↑ Dep' : '↓ Arr'}
                      </span>
                      <span className="flex-1 text-foreground">
                        {[f.airline, f.flightNumber].filter(Boolean).join(' ') || 'Flight'}
                        <span className="text-muted-foreground"> · {fmtTime(f.scheduledAt)}{f.airport ? ` · ${f.airport}` : ''}</span>
                        {f.notes && <span className="block text-muted-foreground">{f.notes}</span>}
                      </span>
                      <button
                        onClick={() => { const fd = new FormData(); fd.set('departureId', departureId); fd.set('id', f.id); act(() => deleteTravellerFlight(fd)) }}
                        disabled={pending} className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Delete flight">✕</button>
                    </li>
                  ))}
                </ul>
                {showAddFlight && (
                  <form onSubmit={handleAddFlight} className="space-y-2 border-t border-border/70 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select name="direction" defaultValue="arrival" className={inputCls}>
                        <option value="arrival">Arrival</option>
                        <option value="departure">Departure</option>
                      </select>
                      <input name="airline" placeholder="Airline" className={inputCls} />
                      <input name="flightNumber" placeholder="Flight no." className={inputCls} />
                      <input name="airport" placeholder="Airport" className={inputCls} />
                      <input name="scheduledAt" type="datetime-local" className={`${inputCls} col-span-2`} />
                    </div>
                    <input name="notes" placeholder="Notes (optional)" className={inputCls} />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" loading={pending} loadingText="Saving…">Add</Button>
                      <button type="button" onClick={() => setShowAddFlight(false)}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border hover:bg-muted">Cancel</button>
                    </div>
                  </form>
                )}
              </div>

              {/* Details */}
              <form onSubmit={handleExtras}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rider details</h3>
                <label className="mb-2 flex items-center gap-2 text-xs text-foreground">
                  <input type="checkbox" name="isRider" defaultChecked={t.isRider} className="rounded border-border" />
                  Rides a motorbike (uncheck for pillion passenger)
                </label>
                <div className="grid gap-2">
                  <input name="dietary" defaultValue={t.dietary ?? ''} placeholder="Dietary requirements" className={inputCls} />
                  <input name="allergies" defaultValue={t.allergies ?? ''} placeholder="Allergies" className={inputCls} />
                  <input name="emergency" defaultValue={t.emergency ?? ''} placeholder="Emergency contact" className={inputCls} />
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <Button type="submit" size="sm" variant="secondary" loading={pending} loadingText="Saving…">Save details</Button>
                  {t.passportNumber ? <span>Passport ✓</span> : <span>No passport on file</span>}
                  {t.phone && <span>· {t.phone}</span>}
                </div>
              </form>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

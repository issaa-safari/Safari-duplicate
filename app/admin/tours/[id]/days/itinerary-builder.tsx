'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUpload } from '@/components/admin/image-upload'

type Lookup = { id: string; name: string; destination_id?: string | null }

type Day = {
  _key: string
  id: string | null
  day_number: number
  day_number_end: number | null
  title_en: string
  title_ar: string
  description_en: string
  description_ar: string
  destination_id: string | null
  accommodation_id: string | null
  accommodation_alt_id: string | null
  activity_ids: string[]
  meal_breakfast: boolean
  meal_lunch: boolean
  meal_dinner: boolean
  distance_km: number | null
  image_url: string | null
}

const GRID_COLS = '90px 1fr 1.2fr 1.4fr 120px 70px'

function blankDay(n: number): Day {
  return {
    _key: Math.random().toString(36).slice(2),
    id: null,
    day_number: n,
    day_number_end: null,
    title_en: '',
    title_ar: '',
    description_en: '',
    description_ar: '',
    destination_id: null,
    accommodation_id: null,
    accommodation_alt_id: null,
    activity_ids: [],
    meal_breakfast: false,
    meal_lunch: false,
    meal_dinner: false,
    distance_km: null,
    image_url: null,
  }
}

export default function ItineraryBuilder({
  tourId,
  durationDays,
  initialDays,
  destinations: initDest,
  accommodations: initAcc,
  activities: initAct,
}: {
  tourId: string
  durationDays: number
  initialDays: any[]
  destinations: Lookup[]
  accommodations: Lookup[]
  activities: Lookup[]
}) {
  const router = useRouter()

  const [days, setDays] = useState<Day[]>(
    initialDays.map((d) => ({
      _key: d.id ?? Math.random().toString(36).slice(2),
      id: d.id,
      day_number: d.day_number,
      day_number_end: d.day_number_end,
      title_en: d.title_en ?? '',
      title_ar: d.title_ar ?? '',
      description_en: d.description_en ?? '',
      description_ar: d.description_ar ?? '',
      destination_id: d.destination_id,
      accommodation_id: d.accommodation_id,
      accommodation_alt_id: d.accommodation_alt_id ?? null,
      activity_ids: d.activity_ids ?? [],
      meal_breakfast: d.meal_breakfast ?? false,
      meal_lunch: d.meal_lunch ?? false,
      meal_dinner: d.meal_dinner ?? false,
      distance_km: d.distance_km,
      image_url: d.image_url ?? null,
    }))
  )

  const [destinations, setDestinations] = useState<Lookup[]>(initDest)
  const [accommodations, setAccommodations] = useState<Lookup[]>(initAcc)
  const [activities, setActivities] = useState<Lookup[]>(initAct)

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [arOpen, setArOpen] = useState<Set<number>>(new Set())
  const [adding, setAdding] = useState<{ index: number; kind: 'destination' | 'accommodation' | 'accommodation_alt' | 'activity' } | null>(null)
  const [newName, setNewName] = useState('')
  const [addingBusy, setAddingBusy] = useState(false)

  const inputCls = 'w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]'

  function update(i: number, patch: Partial<Day>) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
    setSaved(false)
  }

  function nightsOf(d: Day) {
    return (d.day_number_end ?? d.day_number) - d.day_number + 1
  }
  function setNights(i: number, nights: number) {
    const d = days[i]
    update(i, { day_number_end: nights > 1 ? d.day_number + nights - 1 : null })
  }

  function addDay() {
    const next = days.length ? Math.max(...days.map((d) => d.day_number_end ?? d.day_number)) + 1 : 1
    setDays((p) => [...p, blankDay(next)])
    setSaved(false)
  }
  function generateDays() {
    const arr: Day[] = []
    for (let i = 1; i <= durationDays; i++) arr.push(blankDay(i))
    setDays(arr)
    setSaved(false)
  }
  function removeDay(i: number) {
    setDays((p) => p.filter((_, idx) => idx !== i))
    setSaved(false)
  }
  function move(i: number, dir: -1 | 1) {
    const t = i + dir
    if (t < 0 || t >= days.length) return
    setDays((prev) => {
      const n = [...prev]
      ;[n[i], n[t]] = [n[t], n[i]]
      const num = n[i].day_number, end = n[i].day_number_end
      n[i].day_number = n[t].day_number; n[i].day_number_end = n[t].day_number_end
      n[t].day_number = num; n[t].day_number_end = end
      return n
    })
    setSaved(false)
  }
  function renumber() {
    setDays((p) => p.map((d, i) => ({ ...d, day_number: i + 1, day_number_end: null })))
    setSaved(false)
  }

  function toggleActivity(i: number, actId: string) {
    const d = days[i]
    const has = d.activity_ids.includes(actId)
    update(i, { activity_ids: has ? d.activity_ids.filter((a) => a !== actId) : [...d.activity_ids, actId] })
  }

  async function confirmAdd() {
    if (!adding) return
    const name = newName.trim()
    if (!name) return
    setAddingBusy(true)
    try {
      const dayDestId = days[adding.index]?.destination_id ?? null
      const kindForApi = adding.kind === 'accommodation_alt' ? 'accommodation' : adding.kind
      const res = await fetch('/api/admin/create-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: kindForApi,
          name,
          destinationId: kindForApi !== 'destination' ? dayDestId : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add')
      const item = json.item as Lookup
      if (adding.kind === 'destination') {
        setDestinations((p) => [...p, item].sort((a, b) => a.name.localeCompare(b.name)))
        update(adding.index, { destination_id: item.id })
      } else if (adding.kind === 'accommodation') {
        setAccommodations((p) => [...p, item].sort((a, b) => a.name.localeCompare(b.name)))
        update(adding.index, { accommodation_id: item.id })
      } else if (adding.kind === 'accommodation_alt') {
        setAccommodations((p) => [...p, item].sort((a, b) => a.name.localeCompare(b.name)))
        update(adding.index, { accommodation_alt_id: item.id })
      } else if (adding.kind === 'activity') {
        setActivities((p) => [...p, item].sort((a, b) => a.name.localeCompare(b.name)))
        toggleActivity(adding.index, item.id)
      }
      setAdding(null); setNewName('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAddingBusy(false)
    }
  }

  async function save() {
    setLoading(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/admin/save-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tourId, days }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      setSaved(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function AddInline() {
    return (
      <div className="flex gap-1 mt-1">
        <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder="New name" className={inputCls} />
        <button onClick={confirmAdd} disabled={addingBusy}
          className="rounded-md px-2 text-xs text-white" style={{ backgroundColor: '#7A9A4A' }}>
          {addingBusy ? '…' : 'Add'}
        </button>
        <button onClick={() => { setAdding(null); setNewName('') }}
          className="rounded-md border border-gray-300 px-2 text-xs text-gray-600">×</button>
      </div>
    )
  }

  const MealPill = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
    <button type="button" onClick={onClick}
      className={'h-7 w-7 rounded-md text-xs font-semibold border ' +
        (on ? 'bg-[#7A9A4A] text-white border-[#7A9A4A]' : 'bg-white text-gray-400 border-gray-300')}>
      {label}
    </button>
  )

  return (
    <div className="space-y-4">
      {days.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center space-y-4">
          <p className="text-sm text-gray-500">No itinerary days yet.</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={generateDays} className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: '#7A9A4A' }}>
              Generate {durationDays} blank days
            </button>
            <button onClick={addDay} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Add one day
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[900px] space-y-3">
            <div className="grid gap-3 px-2 text-xs font-medium text-gray-500" style={{ gridTemplateColumns: GRID_COLS }}>
              <div>Days</div>
              <div>Main Destination</div>
              <div>Accommodation</div>
              <div>Activities</div>
              <div>Meal Plan</div>
              <div></div>
            </div>

            {days.map((day, i) => {
              const dayActs = activities.filter((a) => day.activity_ids.includes(a.id))
              const availActs = activities.filter((a) => !day.activity_ids.includes(a.id))
              return (
                <div key={day._key} className="grid gap-3 bg-white rounded-lg border border-gray-200 p-3 items-start" style={{ gridTemplateColumns: GRID_COLS }}>
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-gray-900">
                      Day {day.day_number}{day.day_number_end ? `–${day.day_number_end}` : ''}
                    </span>
                    <input type="number" min={1} value={day.day_number}
                      onChange={(e) => update(i, { day_number: Number(e.target.value) })}
                      className={inputCls} />
                    <input type="number" min={0} value={day.distance_km ?? ''}
                      onChange={(e) => update(i, { distance_km: e.target.value ? Number(e.target.value) : null })}
                      placeholder="km" className={inputCls} />
                  </div>

                  <div>
                    <select value={day.destination_id ?? ''}
                      onChange={(e) => {
                        if (e.target.value === '__add__') { setAdding({ index: i, kind: 'destination' }); setNewName('') }
                        else update(i, { destination_id: e.target.value || null })
                      }}
                      className={inputCls}>
                      <option value="">— none —</option>
                      {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      <option value="__add__">+ Add new…</option>
                    </select>
                    {adding?.index === i && adding.kind === 'destination' && <AddInline />}
                  </div>

                  <div className="space-y-2">
                    <select value={day.accommodation_id ?? ''}
                      onChange={(e) => {
                        if (e.target.value === '__add__') { setAdding({ index: i, kind: 'accommodation' }); setNewName('') }
                        else update(i, { accommodation_id: e.target.value || null })
                      }}
                      className={inputCls}>
                      <option value="">— no accommodation —</option>
                      {accommodations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      <option value="__add__">+ Add new…</option>
                    </select>
                    {adding?.index === i && adding.kind === 'accommodation' && <AddInline />}

                    <select value={nightsOf(day)} onChange={(e) => setNights(i, Number(e.target.value))}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 bg-white">
                      {Array.from({ length: 14 }, (_, k) => k + 1).map((nn) => (
                        <option key={nn} value={nn}>{nn} night{nn > 1 ? 's' : ''}</option>
                      ))}
                    </select>

                    <select value={day.accommodation_alt_id ?? ''}
                      onChange={(e) => {
                        if (e.target.value === '__add__') { setAdding({ index: i, kind: 'accommodation_alt' }); setNewName('') }
                        else update(i, { accommodation_alt_id: e.target.value || null })
                      }}
                      className={inputCls + ' text-gray-500'}>
                      <option value="">+ Alternative (optional)</option>
                      {accommodations.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      <option value="__add__">+ Add new…</option>
                    </select>
                    {adding?.index === i && adding.kind === 'accommodation_alt' && <AddInline />}
                  </div>

                  <div className="space-y-2">
                    {dayActs.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {dayActs.map((a) => (
                          <span key={a.id} className="inline-flex items-center gap-1 text-xs bg-[#7A9A4A]/10 text-[#4C5E2A] px-2 py-0.5 rounded-full">
                            {a.name}
                            <button onClick={() => toggleActivity(i, a.id)} className="text-[#4C5E2A]/60 hover:text-[#4C5E2A]">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <select value=""
                      onChange={(e) => {
                        if (e.target.value === '__add__') { setAdding({ index: i, kind: 'activity' }); setNewName('') }
                        else if (e.target.value) toggleActivity(i, e.target.value)
                      }}
                      className={inputCls}>
                      <option value="">+ Add activity…</option>
                      {availActs.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      <option value="__add__">+ Add new activity…</option>
                    </select>
                    {adding?.index === i && adding.kind === 'activity' && <AddInline />}
                    <input type="text" value={day.title_en}
                      onChange={(e) => update(i, { title_en: e.target.value })}
                      placeholder="Day title (required)" className={inputCls} />
                    <p className="text-[10px] text-gray-400 leading-snug">
                      Day description is pulled automatically from the selected destination
                      in the Content library (English/Arabic by client language).
                    </p>
                    <button type="button"
                      onClick={() => setArOpen(prev => {
                        const next = new Set(prev)
                        next.has(i) ? next.delete(i) : next.add(i)
                        return next
                      })}
                      className="text-[10px] text-gray-400 hover:text-[#7A9A4A] transition">
                      {arOpen.has(i) ? '▲ Hide Arabic' : '🇸🇦 + Arabic title'}
                    </button>
                    {arOpen.has(i) && (
                      <div className="mt-1 pt-1 border-t border-amber-100 space-y-1.5" dir="rtl">
                        <input type="text" value={day.title_ar}
                          onChange={(e) => update(i, { title_ar: e.target.value })}
                          placeholder="عنوان اليوم" className={inputCls + ' text-right'} />
                      </div>
                    )}
                    <div className="pt-1">
                      <span className="block text-[10px] text-gray-400 mb-1">Day photo</span>
                      <ImageUpload value={day.image_url} onChange={(url) => update(i, { image_url: url })} folder="tour-days" label="Day photo" />
                    </div>
                  </div>

                  <div className="flex gap-1 pt-1">
                    <MealPill on={day.meal_breakfast} label="B" onClick={() => update(i, { meal_breakfast: !day.meal_breakfast })} />
                    <MealPill on={day.meal_lunch} label="L" onClick={() => update(i, { meal_lunch: !day.meal_lunch })} />
                    <MealPill on={day.meal_dinner} label="D" onClick={() => update(i, { meal_dinner: !day.meal_dinner })} />
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0}
                      className="px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">↑</button>
                    <button onClick={() => move(i, 1)} disabled={i === days.length - 1}
                      className="px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">↓</button>
                    <button onClick={() => removeDay(i)}
                      className="px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 rounded">✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {days.length > 0 && (
        <div className="flex items-center gap-3">
          <button onClick={addDay} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">+ Add Day</button>
          <button onClick={renumber} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Renumber 1→{days.length}</button>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">{error}</p>}
      {saved && <p className="text-sm text-green-600 bg-green-50 rounded-md px-4 py-3">Itinerary saved.</p>}

      {days.length > 0 && (
        <div className="sticky bottom-4">
          <button onClick={save} disabled={loading}
            className="rounded-md px-6 py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-60"
            style={{ backgroundColor: '#7A9A4A' }}>
            {loading ? 'Saving…' : 'Save Itinerary'}
          </button>
        </div>
      )}
    </div>
  )
}
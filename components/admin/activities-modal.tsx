'use client'

import { useState } from 'react'
import Dialog from '@/components/ui/dialog'
import CreateLookupDialog from './create-lookup-dialog'

const G = '#7A9A4A'

export type DayActivity = {
  activity_id: string
  moment: 'morning' | 'afternoon' | 'evening' | 'night' | ''
  optional: boolean
  destination_id: string | null
}

type Lookup = { id: string; name: string }

const MOMENTS: { value: DayActivity['moment']; label: string }[] = [
  { value: '', label: 'Any time' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
]

export function newActivity(destinationId: string | null = null): DayActivity {
  return { activity_id: '', moment: '', optional: false, destination_id: destinationId }
}

export default function ActivitiesModal({
  dayLabel,
  value,
  activities,
  destinations,
  dayDestinationId,
  onChange,
  onClose,
  onCreateActivity,
  onCreateDestination,
}: {
  dayLabel: string
  value: DayActivity[]
  activities: Lookup[]
  destinations: Lookup[]
  dayDestinationId: string | null
  onChange: (rows: DayActivity[]) => void
  onClose: () => void
  onCreateActivity?: (name: string, descriptionEn: string, descriptionAr: string) => Promise<Lookup | null>
  onCreateDestination?: (name: string, descriptionEn: string, descriptionAr: string) => Promise<Lookup | null>
}) {
  const [rows, setRows] = useState<DayActivity[]>(value.length ? value : [newActivity(dayDestinationId)])
  const [extraAct, setExtraAct] = useState<Lookup[]>([])
  const [extraDest, setExtraDest] = useState<Lookup[]>([])
  const [creating, setCreating] = useState<null | { kind: 'activity' | 'destination'; row: number }>(null)

  const allActivities = [...activities, ...extraAct]
  const allDestinations = [...destinations, ...extraDest]

  function handleActivitySelect(i: number, val: string) {
    if (val === '__add__') { if (onCreateActivity) setCreating({ kind: 'activity', row: i }); return }
    update(i, { activity_id: val })
  }
  function handleLocationSelect(i: number, val: string) {
    if (val === '__add__') { if (onCreateDestination) setCreating({ kind: 'destination', row: i }); return }
    update(i, { destination_id: val || null })
  }

  const update = (i: number, patch: Partial<DayActivity>) =>
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const remove = (i: number) => setRows(rs => rs.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => setRows(rs => {
    const j = i + dir
    if (j < 0 || j >= rs.length) return rs
    const copy = [...rs]; const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp; return copy
  })
  const add = () => setRows(rs => [...rs, newActivity(dayDestinationId)])

  function save() {
    onChange(rows.filter(r => r.activity_id))
    onClose()
  }

  const cell = 'px-2 py-1 align-top'
  const sel = 'w-full rounded border border-gray-300 px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]'

  return (
    <Dialog
      title={`Activities — ${dayLabel}`}
      titleClass="text-lg"
      maxWidth="max-w-3xl"
      overlayClass="z-50 pt-12"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white">
            Cancel
          </button>
          <button type="button" onClick={save}
            className="rounded-md bg-olive px-5 py-2 text-sm font-medium text-white">
            Save Activities
          </button>
        </>
      }
    >
      <div className="p-4 max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-2 py-1 w-8"></th>
                <th className="px-2 py-1">Activity Type</th>
                <th className="px-2 py-1">Location</th>
                <th className="px-2 py-1 w-32">Moment</th>
                <th className="px-2 py-1 w-20 text-center">Optional</th>
                <th className="px-2 py-1 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className={cell}>
                    <div className="flex flex-col">
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs">↑</button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down"
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs">↓</button>
                    </div>
                  </td>
                  <td className={cell}>
                    <select className={sel} value={row.activity_id} aria-label="Activity type"
                      onChange={e => handleActivitySelect(i, e.target.value)}>
                      <option value="">Select activity…</option>
                      {allActivities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      {onCreateActivity && <option value="__add__">+ Add new activity…</option>}
                    </select>
                  </td>
                  <td className={cell}>
                    <select className={sel} value={row.destination_id ?? ''} aria-label="Location"
                      onChange={e => handleLocationSelect(i, e.target.value)}>
                      <option value="">{dayDestinationId ? 'Day destination' : '— none —'}</option>
                      {allDestinations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      {onCreateDestination && <option value="__add__">+ Add new destination…</option>}
                    </select>
                  </td>
                  <td className={cell}>
                    <select className={sel} value={row.moment} aria-label="Moment"
                      onChange={e => update(i, { moment: e.target.value as DayActivity['moment'] })}>
                      {MOMENTS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </td>
                  <td className={cell + ' text-center'}>
                    <button type="button" onClick={() => update(i, { optional: !row.optional })}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${row.optional ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {row.optional ? 'Optional' : 'Included'}
                    </button>
                  </td>
                  <td className={cell}>
                    <button type="button" onClick={() => remove(i)} aria-label="Remove activity"
                      className="text-gray-300 hover:text-red-500 text-lg leading-none">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="button" onClick={add}
            className="mt-3 text-sm font-medium hover:underline" style={{ color: G }}>
            + Add activity
          </button>
        </div>

      {creating && (
        <CreateLookupDialog
          title={creating.kind === 'activity' ? 'New Activity' : 'New Destination'}
          onClose={() => setCreating(null)}
          onSubmit={async (name, en, ar) => {
            if (creating.kind === 'activity' && onCreateActivity) {
              const item = await onCreateActivity(name, en, ar)
              if (item) { setExtraAct(e => [...e, item]); update(creating.row, { activity_id: item.id }) }
            } else if (creating.kind === 'destination' && onCreateDestination) {
              const item = await onCreateDestination(name, en, ar)
              if (item) { setExtraDest(e => [...e, item]); update(creating.row, { destination_id: item.id }) }
            }
          }}
        />
      )}
    </Dialog>
  )
}

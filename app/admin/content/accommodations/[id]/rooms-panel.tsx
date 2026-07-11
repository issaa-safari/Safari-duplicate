'use client'

import { useState, useTransition } from 'react'
import { addRoom, deleteRoom } from './room-actions'

interface Room {
  id: string
  name: string
  room_type: string | null
  bed_config: string | null
  max_occupancy: number
  amenities: string[]
}

const inputCls = 'rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

export default function RoomsPanel({ accommodationId, rooms: initial }: { accommodationId: string; rooms: Room[] }) {
  const [rooms, setRooms] = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set('accommodationId', accommodationId)
    startTransition(async () => {
      try {
        await addRoom(fd)
        setRooms(r => [...r, {
          id: crypto.randomUUID(),
          name: (fd.get('name') as string) || '',
          room_type: (fd.get('roomType') as string) || null,
          bed_config: (fd.get('bedConfig') as string) || null,
          max_occupancy: Number(fd.get('maxOccupancy')) || 2,
          amenities: ((fd.get('amenities') as string) || '').split(',').map(s => s.trim()).filter(Boolean),
        }])
        form.reset()
        setShowAdd(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add room.')
      }
    })
  }

  function handleDelete(id: string) {
    const fd = new FormData()
    fd.set('id', id)
    fd.set('accommodationId', accommodationId)
    startTransition(async () => {
      await deleteRoom(fd)
      setRooms(r => r.filter(x => x.id !== id))
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-8">
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Rooms</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Room types can carry their own seasonal rate cards.</p>
          </div>
          {!showAdd && (
            <button onClick={() => { setShowAdd(true); setError('') }}
              className="text-xs text-[var(--olive)] hover:text-[var(--olive-dk)] font-medium">+ Add Room</button>
          )}
        </div>

        <ul className="space-y-2 mb-4">
          {rooms.length === 0 && !showAdd && <li className="text-xs text-muted-foreground">No rooms yet.</li>}
          {rooms.map(r => (
            <li key={r.id} className="flex items-start gap-3 group border border-gray-100 rounded-md p-3">
              <div className="flex-1 min-w-0 text-sm">
                <p className="font-medium text-gray-800">
                  {r.name}
                  {r.room_type && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">{r.room_type}</span>}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sleeps {r.max_occupancy}{r.bed_config ? ` · ${r.bed_config}` : ''}
                </p>
                {r.amenities.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">{r.amenities.join(', ')}</p>}
              </div>
              <button onClick={() => handleDelete(r.id)} disabled={pending}
                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs shrink-0" aria-label="Delete">✕</button>
            </li>
          ))}
        </ul>

        {showAdd && (
          <form onSubmit={handleAdd} className="space-y-2 border-t border-gray-100 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <input name="name" placeholder="Room name *" required className={inputCls} />
              <input name="roomType" placeholder="Type (e.g. suite)" className={inputCls} />
              <input name="bedConfig" placeholder="Beds (e.g. 1 King)" className={inputCls} />
              <input name="maxOccupancy" type="number" min={1} defaultValue={2} placeholder="Max occupancy" className={inputCls} />
            </div>
            <input name="amenities" placeholder="Amenities, comma-separated" className={`${inputCls} w-full`} />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={pending}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 bg-olive hover:bg-olive-dk">
                {pending ? 'Saving…' : 'Add Room'}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setError('') }}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { assignStaff, unassignStaff, assignVehicle, unassignVehicle } from './assignment-actions'

interface StaffAssignment { id: string; role: string | null; tour_staff: { id: string; name: string; role: string } | null }
interface VehicleAssignment { id: string; seats_used: number | null; vehicles: { id: string; name: string; type: string; seats: number } | null }
interface StaffOption { id: string; name: string; role: string }
interface VehicleOption { id: string; name: string; type: string; seats: number }

const inputCls = 'rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

export default function AssignmentManager({
  requestId, staffAssignments, vehicleAssignments, staffOptions, vehicleOptions,
}: {
  requestId: string
  staffAssignments: StaffAssignment[]
  vehicleAssignments: VehicleAssignment[]
  staffOptions: StaffOption[]
  vehicleOptions: VehicleOption[]
}) {
  const [staff, setStaff] = useState(staffAssignments)
  const [vehicles, setVehicles] = useState(vehicleAssignments)
  const [staffId, setStaffId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const availableStaff = staffOptions.filter(o => !staff.some(a => a.tour_staff?.id === o.id))
  const availableVehicles = vehicleOptions.filter(o => !vehicles.some(a => a.vehicles?.id === o.id))

  function addStaff() {
    if (!staffId) return
    setError('')
    const opt = staffOptions.find(o => o.id === staffId)
    const fd = new FormData(); fd.set('requestId', requestId); fd.set('staffId', staffId)
    startTransition(async () => {
      try {
        await assignStaff(fd)
        setStaff(s => [...s, { id: crypto.randomUUID(), role: null, tour_staff: opt ? { id: opt.id, name: opt.name, role: opt.role } : null }])
        setStaffId('')
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed.') }
    })
  }
  function removeStaff(id: string) {
    const fd = new FormData(); fd.set('id', id); fd.set('requestId', requestId)
    startTransition(async () => { await unassignStaff(fd); setStaff(s => s.filter(a => a.id !== id)) })
  }
  function addVehicle() {
    if (!vehicleId) return
    setError('')
    const opt = vehicleOptions.find(o => o.id === vehicleId)
    const fd = new FormData(); fd.set('requestId', requestId); fd.set('vehicleId', vehicleId)
    startTransition(async () => {
      try {
        await assignVehicle(fd)
        setVehicles(v => [...v, { id: crypto.randomUUID(), seats_used: null, vehicles: opt ? { id: opt.id, name: opt.name, type: opt.type, seats: opt.seats } : null }])
        setVehicleId('')
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed.') }
    })
  }
  function removeVehicle(id: string) {
    const fd = new FormData(); fd.set('id', id); fd.set('requestId', requestId)
    startTransition(async () => { await unassignVehicle(fd); setVehicles(v => v.filter(a => a.id !== id)) })
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Staff</h3>
        <ul className="space-y-1.5 mb-3">
          {staff.length === 0 && <li className="text-xs text-muted-foreground">No staff assigned.</li>}
          {staff.map(a => (
            <li key={a.id} className="flex items-center gap-2 group text-sm">
              <span className="flex-1 text-gray-700">
                {a.tour_staff?.name ?? 'Unknown'}
                {a.tour_staff?.role && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">{a.tour_staff.role}</span>}
              </span>
              <button onClick={() => removeStaff(a.id)} disabled={pending}
                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs" aria-label="Remove">✕</button>
            </li>
          ))}
        </ul>
        {availableStaff.length > 0 && (
          <div className="flex gap-2">
            <select value={staffId} onChange={e => setStaffId(e.target.value)} className={`${inputCls} flex-1`}>
              <option value="">Assign staff…</option>
              {availableStaff.map(o => <option key={o.id} value={o.id}>{o.name} ({o.role})</option>)}
            </select>
            <button onClick={addStaff} disabled={pending || !staffId}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 bg-olive hover:bg-olive-dk">Add</button>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Vehicles</h3>
        <ul className="space-y-1.5 mb-3">
          {vehicles.length === 0 && <li className="text-xs text-muted-foreground">No vehicles assigned.</li>}
          {vehicles.map(a => (
            <li key={a.id} className="flex items-center gap-2 group text-sm">
              <span className="flex-1 text-gray-700">
                {a.vehicles?.name ?? 'Unknown'}
                {a.vehicles?.type && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">{a.vehicles.type}</span>}
                {a.vehicles?.seats != null && <span className="ml-1 text-xs text-muted-foreground">{a.vehicles.seats} seats</span>}
              </span>
              <button onClick={() => removeVehicle(a.id)} disabled={pending}
                className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs" aria-label="Remove">✕</button>
            </li>
          ))}
        </ul>
        {availableVehicles.length > 0 && (
          <div className="flex gap-2">
            <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={`${inputCls} flex-1`}>
              <option value="">Assign vehicle…</option>
              {availableVehicles.map(o => <option key={o.id} value={o.id}>{o.name} · {o.type} ({o.seats} seats)</option>)}
            </select>
            <button onClick={addVehicle} disabled={pending || !vehicleId}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 bg-olive hover:bg-olive-dk">Add</button>
          </div>
        )}
      </div>
    </div>
  )
}

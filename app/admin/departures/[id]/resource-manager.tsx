'use client'

import { useState } from 'react'
import { useAction } from '@/lib/hooks/use-action'
import {
  assignDepartureStaff,
  assignDepartureVehicle,
  unassignDepartureStaff,
  unassignDepartureVehicle,
} from './resource-actions'

type StaffAssignment = { id: string; tour_staff: { id: string; name: string; role: string } | null }
type VehicleAssignment = { id: string; seats_used: number | null; vehicles: { id: string; name: string; type: string; seats: number } | null }
type StaffOption = { id: string; name: string; role: string }
type VehicleOption = { id: string; name: string; type: string; seats: number }

const input = 'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground'

export default function DepartureResourceManager({ departureId, staffAssignments, vehicleAssignments, staffOptions, vehicleOptions }: {
  departureId: string
  staffAssignments: StaffAssignment[]
  vehicleAssignments: VehicleAssignment[]
  staffOptions: StaffOption[]
  vehicleOptions: VehicleOption[]
}) {
  const [staffId, setStaffId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [seatsUsed, setSeatsUsed] = useState('')
  const [error, setError] = useState('')
  const { pending, run } = useAction()
  const availableStaff = staffOptions.filter(option => !staffAssignments.some(assignment => assignment.tour_staff?.id === option.id))
  const availableVehicles = vehicleOptions.filter(option => !vehicleAssignments.some(assignment => assignment.vehicles?.id === option.id))

  function form(values: Record<string, string>) {
    const data = new FormData()
    data.set('departureId', departureId)
    for (const [key, value] of Object.entries(values)) data.set(key, value)
    return data
  }

  function execute(action: () => Promise<void>) {
    setError('')
    run(async () => {
      try { await action() } catch (err) { setError(err instanceof Error ? err.message : 'Could not update trip resources.') }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {error && <p className="lg:col-span-2 rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      <div>
        <h3 className="text-sm font-semibold text-foreground">Trip team</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Guides, mechanics and support staff assigned to this operation.</p>
        <ul className="my-3 space-y-2">
          {staffAssignments.length === 0 && <li className="text-xs text-muted-foreground">No trip staff assigned.</li>}
          {staffAssignments.map(assignment => (
            <li key={assignment.id} className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1"><span className="font-medium text-foreground">{assignment.tour_staff?.name ?? 'Unknown staff'}</span><span className="ml-2 text-xs capitalize text-muted-foreground">{assignment.tour_staff?.role}</span></span>
              <button type="button" disabled={pending} onClick={() => execute(() => unassignDepartureStaff(form({ id: assignment.id })))} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <select value={staffId} onChange={event => setStaffId(event.target.value)} className={input}>
            <option value="">Assign staff…</option>
            {availableStaff.map(option => <option key={option.id} value={option.id}>{option.name} · {option.role}</option>)}
          </select>
          <button type="button" disabled={pending || !staffId} onClick={() => execute(async () => { await assignDepartureStaff(form({ staffId })); setStaffId('') })} className="rounded-lg bg-primary-strong px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Add</button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">Trip vehicles</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Support, transfer and luggage vehicles allocated to the trip.</p>
        <ul className="my-3 space-y-2">
          {vehicleAssignments.length === 0 && <li className="text-xs text-muted-foreground">No trip vehicles assigned.</li>}
          {vehicleAssignments.map(assignment => (
            <li key={assignment.id} className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1"><span className="font-medium text-foreground">{assignment.vehicles?.name ?? 'Unknown vehicle'}</span><span className="ml-2 text-xs capitalize text-muted-foreground">{assignment.vehicles?.type} · {assignment.seats_used ?? assignment.vehicles?.seats ?? 0} seats</span></span>
              <button type="button" disabled={pending} onClick={() => execute(() => unassignDepartureVehicle(form({ id: assignment.id })))} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-[minmax(0,1fr)_6rem_auto] gap-2">
          <select value={vehicleId} onChange={event => setVehicleId(event.target.value)} className={input}>
            <option value="">Assign vehicle…</option>
            {availableVehicles.map(option => <option key={option.id} value={option.id}>{option.name} · {option.type}</option>)}
          </select>
          <input type="number" min={1} value={seatsUsed} onChange={event => setSeatsUsed(event.target.value)} placeholder="Seats" aria-label="Seats used" className={input} />
          <button type="button" disabled={pending || !vehicleId} onClick={() => execute(async () => { await assignDepartureVehicle(form({ vehicleId, seatsUsed })); setVehicleId(''); setSeatsUsed('') })} className="rounded-lg bg-primary-strong px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Add</button>
        </div>
      </div>
    </div>
  )
}

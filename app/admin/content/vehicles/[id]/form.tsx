'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateVehicle } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Toggle } from '@/components/ui/toggle'

interface Vehicle {
  id: string
  name: string
  type: string
  seats: number
  count: number
  description_en: string | null
  image_url: string | null
  is_active: boolean
}

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

export default function VehicleEditForm({ vehicle }: { vehicle: Vehicle }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState(vehicle.is_active)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('isActive', isActive ? 'true' : 'false')
    try {
      await updateVehicle(vehicle.id, formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/content/vehicles" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Vehicles
        </Link>
        <h1 className="text-2xl font-semibold text-brand-ink">Edit Vehicle</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" name="name" required defaultValue={vehicle.name} className={inputCls} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select name="type" defaultValue={vehicle.type} className={inputCls}>
                <option value="jeep">Jeep</option>
                <option value="van">Van</option>
                <option value="bus">Bus</option>
                <option value="motorbike">Motorbike</option>
                <option value="boat">Boat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
              <input type="number" name="seats" min={1} defaultValue={vehicle.seats} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Count</label>
              <input type="number" name="count" min={1} defaultValue={vehicle.count} required className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
            <input type="url" name="imageUrl" defaultValue={vehicle.image_url ?? ''} placeholder="https://…" className={inputCls} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="descriptionEn" rows={3} defaultValue={vehicle.description_en ?? ''}
              placeholder="Optional notes about this vehicle…" className={inputCls} />
          </div>

          <Toggle checked={isActive} onChange={() => setIsActive(!isActive)} label="Active" />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3">
          <Button type="submit" loading={loading} loadingText="Saving…">Save Changes</Button>
          <ButtonLink href="/admin/content/vehicles">Cancel</ButtonLink>
        </div>
      </form>
    </div>
  )
}

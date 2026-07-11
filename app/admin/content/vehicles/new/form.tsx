'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createVehicle } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Toggle } from '@/components/ui/toggle'

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

export default function NewVehicleForm() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState(true)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('isActive', isActive ? 'true' : 'false')
    try {
      await createVehicle(formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/content/vehicles" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Vehicles
        </Link>
        <h1 className="text-xl font-semibold text-foreground">New Vehicle</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Details</h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Name <span className="text-red-500">*</span></label>
            <input id="name" type="text" name="name" required placeholder="e.g. Toyota Land Cruiser 76" className={inputCls} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-foreground mb-1">Type</label>
              <select id="type" name="type" defaultValue="jeep" className={inputCls}>
                <option value="jeep">Jeep</option>
                <option value="van">Van</option>
                <option value="bus">Bus</option>
                <option value="motorbike">Motorbike</option>
                <option value="boat">Boat</option>
              </select>
            </div>
            <div>
              <label htmlFor="seats" className="block text-sm font-medium text-foreground mb-1">Seats</label>
              <input id="seats" type="number" name="seats" min={1} defaultValue={4} required className={inputCls} />
            </div>
            <div>
              <label htmlFor="count" className="block text-sm font-medium text-foreground mb-1">Count</label>
              <input id="count" type="number" name="count" min={1} defaultValue={1} required className={inputCls} />
            </div>
          </div>

          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-foreground mb-1">Image URL</label>
            <input id="imageUrl" type="url" name="imageUrl" placeholder="https://…" className={inputCls} />
          </div>

          <div>
            <label htmlFor="descriptionEn" className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea id="descriptionEn" name="descriptionEn" rows={3} placeholder="Optional notes about this vehicle…" className={inputCls} />
          </div>

          <Toggle checked={isActive} onChange={() => setIsActive(!isActive)} label="Active" />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3">
          <Button type="submit" loading={loading} loadingText="Creating…">Create Vehicle</Button>
          <ButtonLink href="/admin/content/vehicles">Cancel</ButtonLink>
        </div>
      </form>
    </div>
  )
}

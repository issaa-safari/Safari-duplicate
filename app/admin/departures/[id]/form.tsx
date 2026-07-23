'use client'

import { useState } from 'react'
import { useAction } from '@/lib/hooks/use-action'
import Link from 'next/link'
import { updateDeparture, toggleDeparturePublished } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

interface Departure {
  id: string
  tour_id: string
  start_date: string
  end_date: string
  max_seats: number
  booked_seats: number
  price_usd: number
  status: string
  is_active: boolean
  internal_notes: string | null
  tours: {
    id: string
    title_en: string
    title_ar: string
    subtitle_en: string | null
    overview_en: string | null
    type: string | null
  } | null
}

export default function DepartureEditForm({ departure, departureId, tourDays }: { departure: Departure; departureId: string; tourDays: any[] }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState(departure.is_active)
  const { pending: publishLoading, run: runPublish } = useAction()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await updateDeparture(departure.id, formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/departures" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Departures
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Edit Departure</h1>
      </div>

      {departure.tours && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">
            {departure.tours.title_en}
            {departure.tours.type ? ` · ${departure.tours.type}` : ''}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-blue-900 mb-2">Frontend Preview</p>
            <p className="text-blue-800 text-xs mb-3">{departure.tours.overview_en || departure.tours.subtitle_en}</p>
            <p className="text-xs text-blue-700">
              ✓ When published, clients will see the full itinerary with {tourDays.length} day{tourDays.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-foreground mb-1">Start Date</label>
              <input id="startDate"
                type="date"
                name="startDate"
                required
                defaultValue={departure.start_date}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-foreground mb-1">End Date</label>
              <input id="endDate"
                type="date"
                name="endDate"
                required
                defaultValue={departure.end_date}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="maxSeats" className="block text-sm font-medium text-foreground mb-1">Max Seats</label>
              <input id="maxSeats"
                type="number"
                name="maxSeats"
                min={1}
                required
                defaultValue={departure.max_seats}
                className={inputCls}
              />
            </div>
            <div>
              <span className="block text-sm font-medium text-foreground mb-1">Booked Seats</span>
              <div className={`${inputCls} bg-surface-alt text-muted-foreground cursor-default`}>
                {departure.booked_seats}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Computed from confirmed bookings — not editable here.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="priceUsd" className="block text-sm font-medium text-foreground mb-1">Price per Seat (USD)</label>
              <input id="priceUsd"
                type="number"
                name="priceUsd"
                min={0}
                step="0.01"
                required
                defaultValue={departure.price_usd}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select id="status" name="status" defaultValue={departure.status} className={inputCls}>
                <option value="available">Available</option>
                <option value="full">Full</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="internalNotes" className="block text-sm font-medium text-foreground mb-1">Internal Notes</label>
            <textarea id="internalNotes"
              name="internalNotes"
              rows={2}
              placeholder="Not shown to clients"
              defaultValue={departure.internal_notes ?? ''}
              className={inputCls}
            />
          </div>
        </div>

        {/* Itinerary Status */}
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
          <h3 className="font-semibold text-foreground mb-4">Itinerary Status</h3>
          {tourDays && tourDays.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                This departure includes <strong>{tourDays.length} day{tourDays.length !== 1 ? 's' : ''}</strong>:
              </p>
              <div className="space-y-1">
                {tourDays.map((day: any) => (
                  <div key={day.id} className="flex items-start gap-2 text-sm">
                    <span className="text-green-600">✓</span>
                    <span className="text-foreground">
                      <strong>Day {day.day_number}:</strong> {day.title_en}
                      {day.description_en && <span className="text-muted-foreground"> — {day.description_en.substring(0, 50)}...</span>}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href={`/admin/tours/${departure.tours?.id}/days`}
                className="inline-block text-sm font-medium text-brand-text hover:underline mt-3"
              >
                → Edit Itinerary
              </Link>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              <p className="mb-3">No itinerary days found for this tour.</p>
              <Link
                href={`/admin/tours/${departure.tours?.id}/days`}
                className="inline-block font-medium text-brand-text hover:underline"
              >
                → Create Tour Days
              </Link>
            </div>
          )}
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3 items-center">
          <Button type="submit" loading={loading} loadingText="Saving…">Save Changes</Button>
          <ButtonLink href="/admin/departures">Cancel</ButtonLink>
          <div className="flex-1" />
          <button
            type="button"
            disabled={publishLoading}
            onClick={() => runPublish(async () => {
              try {
                await toggleDeparturePublished(departureId)
                setIsActive(!isActive)
              } catch (err: any) {
                setError(err.message ?? 'Failed to toggle published status')
              }
            })}
            className={`rounded-md px-6 py-2.5 text-sm font-medium disabled:opacity-60 ${
              isActive
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}>
            {publishLoading ? 'Updating…' : isActive ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </form>
    </div>
  )
}

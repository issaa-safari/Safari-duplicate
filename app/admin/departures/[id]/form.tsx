'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateDeparture } from './actions'

interface Departure {
  id: string
  start_date: string
  end_date: string
  max_seats: number
  booked_seats: number
  price_usd: number
  status: string
  internal_notes: string | null
  tours: { title_en: string; type: string | null } | null
}

export default function DepartureEditForm({ departure }: { departure: Departure }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]'

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/departures" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Departures
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Edit Departure</h1>
      </div>

      {departure.tours && (
        <p className="text-sm text-gray-500 mb-6">
          {departure.tours.title_en}
          {departure.tours.type ? ` · ${departure.tours.type}` : ''}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                name="startDate"
                required
                defaultValue={departure.start_date}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Seats</label>
              <input
                type="number"
                name="maxSeats"
                min={1}
                required
                defaultValue={departure.max_seats}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booked Seats</label>
              <input
                type="number"
                name="bookedSeats"
                min={0}
                defaultValue={departure.booked_seats}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price per Seat (USD)</label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select name="status" defaultValue={departure.status} className={inputCls}>
                <option value="available">Available</option>
                <option value="full">Full</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <textarea
              name="internalNotes"
              rows={2}
              placeholder="Not shown to clients"
              defaultValue={departure.internal_notes ?? ''}
              className={inputCls}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: '#7A9A4A' }}>
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
          <Link
            href="/admin/departures"
            className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

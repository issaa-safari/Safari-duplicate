'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createDeparture } from './actions'

export default function NewDepartureForm({ tours }: { tours: any[] }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [price, setPrice] = useState('')
  const [maxSeats, setMaxSeats] = useState('12')

  // When a template is chosen, prefill the departure price from its base price
  // (and seats from its max group size). The departure price stays editable and is
  // the single source of truth shown on the website and charged at booking.
  function onTourChange(tourId: string) {
    const tour = tours.find(t => t.id === tourId)
    if (tour?.base_price_usd != null && tour.base_price_usd !== '') {
      setPrice(String(tour.base_price_usd))
    }
    if (tour?.max_group_size) setMaxSeats(String(tour.max_group_size))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await createDeparture(formData)
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
          Back to Departures
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">New Departure</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tour</label>
            <select name="tourId" required defaultValue="" className={inputCls}
              onChange={(e) => onTourChange(e.target.value)}>
              <option value="" disabled>Select a tour…</option>
              {tours.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title_en}{t.type ? ` (${t.type})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" name="startDate" required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" name="endDate" required className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Seats</label>
              <input type="number" name="maxSeats" min={1} value={maxSeats}
                onChange={(e) => setMaxSeats(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Already-booked seats</label>
              <input type="number" name="bookedSeats" min={0} defaultValue={0} className={inputCls} />
              <p className="text-[11px] text-gray-400 mt-1">Only for migrating existing bookings — leave at 0 for new departures.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price per Seat (USD)</label>
              <input type="number" name="priceUsd" min={0} step="0.01" required placeholder="e.g. 4500"
                value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
              <p className="text-[11px] text-gray-400 mt-1">Shown on the website &amp; charged at booking. Pre-filled from the template, editable per departure.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select name="status" defaultValue="available" className={inputCls}>
                <option value="available">Available</option>
                <option value="full">Full</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <textarea name="internalNotes" rows={2} placeholder="Not shown to clients" className={inputCls} />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">{error}</p>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: '#7A9A4A' }}>
            {loading ? 'Creating…' : 'Create Departure'}
          </button>
          <Link href="/admin/departures"
            className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
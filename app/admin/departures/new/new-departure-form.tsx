'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

export default function NewDepartureForm({ tours }: { tours: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [tourId, setTourId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [maxSeats, setMaxSeats] = useState(12)
  const [priceUsd, setPriceUsd] = useState('')
  const [status, setStatus] = useState('available')
  const [notes, setNotes] = useState('')

  function handleTourChange(id: string) {
    setTourId(id)
    const tour = tours.find(t => t.id === id)
    if (tour && startDate) {
      const start = new Date(startDate)
      start.setDate(start.getDate() + (tour.duration_days - 1))
      setEndDate(start.toISOString().slice(0, 10))
    }
    if (tour?.base_price_usd) {
      setPriceUsd(String(tour.base_price_usd))
    }
  }

  function handleStartDateChange(date: string) {
    setStartDate(date)
    if (tourId) {
      const tour = tours.find(t => t.id === tourId)
      if (tour && date) {
        const start = new Date(date)
        start.setDate(start.getDate() + (tour.duration_days - 1))
        setEndDate(start.toISOString().slice(0, 10))
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/create-departure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tour_id: tourId,
          start_date: startDate,
          end_date: endDate,
          max_seats: maxSeats,
          price_usd: parseFloat(priceUsd),
          status,
          internal_notes: notes || null,
          booked_seats: 0,
          is_active: true,
        }),
      })

      if (!res.ok) throw new Error('Failed to create departure')
      router.push('/admin/departures')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-border bg-surface shadow-sm p-5 space-y-4">

        <div>
          <label htmlFor="tour" className="block text-sm font-medium text-foreground mb-1">Tour *</label>
          <select id="tour" required value={tourId} onChange={e => handleTourChange(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50">
            <option value="">Select a tour...</option>
            {tours.map(tour => (
              <option key={tour.id} value={tour.id}>
                {tour.title_en} ({tour.duration_days} days)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-foreground mb-1">Start Date *</label>
            <input id="start-date" type="date" required value={startDate}
              onChange={e => handleStartDateChange(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50" />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-foreground mb-1">End Date *</label>
            <input id="end-date" type="date" required value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50" />
            <p className="text-xs text-muted-foreground mt-1">Auto-calculated from tour duration</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="max-seats" className="block text-sm font-medium text-foreground mb-1">Max Seats *</label>
            <input id="max-seats" type="number" required min={1} value={maxSeats}
              onChange={e => setMaxSeats(Number(e.target.value))}
              className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50" />
          </div>
          <div>
            <label htmlFor="price-per-person-usd" className="block text-sm font-medium text-foreground mb-1">Price Per Person (USD) *</label>
            <input id="price-per-person-usd" type="number" required min={0} value={priceUsd}
              onChange={e => setPriceUsd(e.target.value)}
              placeholder="e.g. 1350"
              className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50" />
          </div>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-foreground mb-1">Status</label>
          <select id="status" value={status} onChange={e => setStatus(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50">
            <option value="available">Available</option>
            <option value="limited">Limited</option>
            <option value="full">Full</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label htmlFor="internal-notes" className="block text-sm font-medium text-foreground mb-1">Internal Notes</label>
          <textarea id="internal-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Any private notes about this departure..."
            className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50" />
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex gap-3">
        <Button type="submit" loading={loading} loadingText="Saving...">Add Departure</Button>
        <ButtonLink href="/admin/departures">Cancel</ButtonLink>
      </div>
    </form>
  )
}
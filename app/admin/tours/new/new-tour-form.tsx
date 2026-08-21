'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createTour } from './actions'

type SourceTour = { id: string; title_en: string; type: string; duration_days: number | null }

const TYPE_LABEL: Record<string, string> = {
  bike: '🏍️ Bike Tour',
  private: '🦁 Private Safari',
  group: '👥 Group Safari',
}

export default function NewTourForm({ sourceTours }: { sourceTours: SourceTour[] }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sourceTourId, setSourceTourId] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [type, setType] = useState('bike')
  const [durationDays, setDurationDays] = useState(8)

  function handleSourceChange(id: string) {
    setSourceTourId(id)
    const src = sourceTours.find((t) => t.id === id)
    if (src) {
      setTitleEn(`Copy of ${src.title_en}`)
      setType(src.type)
      setDurationDays(src.duration_days || 1)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await createTour(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/tours" className="text-sm text-muted-foreground hover:text-foreground">
          Back to Tours
        </Link>
        <h1 className="text-xl font-semibold text-foreground">New Itinerary</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {sourceTours.length > 0 && (
          <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-2">
            <label htmlFor="sourceTourId" className="block text-sm font-medium text-foreground mb-1">
              Start from a saved itinerary
            </label>
            <select id="sourceTourId" name="sourceTourId" value={sourceTourId}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50">
              <option value="">— Start blank —</option>
              {sourceTours.map((t) => (
                <option key={t.id} value={t.id}>{t.title_en}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Copies all content and itinerary days from the selected itinerary so you can edit
              and save it as a new one, without touching the original.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            {sourceTourId
              ? 'Review the name, type, and length copied from the saved itinerary, then create the clone. You’ll edit everything else — including itinerary days — on the next screen.'
              : 'Give the tour a name, type, and length to create it as a draft. You’ll add the rest of the details on the next screen.'}
          </p>

          <div>
            <label htmlFor="titleEn" className="block text-sm font-medium text-foreground mb-1">Title (English)</label>
            <input id="titleEn" type="text" name="titleEn" required autoFocus
              value={titleEn} onChange={(e) => setTitleEn(e.target.value)}
              placeholder="e.g. Kenya Lakes, Mountains & Forest Trails"
              className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-foreground mb-1">Tour Type</label>
              <select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50">
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="durationDays" className="block text-sm font-medium text-foreground mb-1">Duration (days)</label>
              <input id="durationDays" type="number" name="durationDays" min={1} value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50" />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">{error}</p>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60 bg-olive hover:bg-olive-dk">
            {loading ? (sourceTourId ? 'Cloning…' : 'Creating…') : (sourceTourId ? 'Clone Itinerary' : 'Create Tour')}
          </button>
          <Link href="/admin/tours"
            className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

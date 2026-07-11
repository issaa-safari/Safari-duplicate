'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createTour } from './actions'

export default function NewTourPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await createTour(formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/tours" className="text-sm text-muted-foreground hover:text-foreground">
          Back to Tours
        </Link>
        <h1 className="text-xl font-semibold text-foreground">New Tour</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Give the tour a name, type, and length to create it as a draft. You&apos;ll add
            the rest of the details on the next screen.
          </p>

          <div>
            <label htmlFor="titleEn" className="block text-sm font-medium text-foreground mb-1">Title (English)</label>
            <input id="titleEn" type="text" name="titleEn" required autoFocus
              placeholder="e.g. Kenya Lakes, Mountains & Forest Trails"
              className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-foreground mb-1">Tour Type</label>
              <select id="type" name="type" defaultValue="bike"
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)]">
                <option value="bike">🏍️ Bike Tour</option>
                <option value="private">🦁 Private Safari</option>
                <option value="group">👥 Group Safari</option>
              </select>
            </div>
            <div>
              <label htmlFor="durationDays" className="block text-sm font-medium text-foreground mb-1">Duration (days)</label>
              <input id="durationDays" type="number" name="durationDays" min={1} defaultValue={8}
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">{error}</p>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60 bg-olive hover:bg-olive-dk">
            {loading ? 'Creating...' : 'Create Tour'}
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
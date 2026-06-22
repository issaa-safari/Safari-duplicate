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
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/tours" className="text-sm text-gray-500 hover:text-gray-700">
          Back to Tours
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">New Tour</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Give the tour a name, type, and length to create it as a draft. You&apos;ll add
            the rest of the details on the next screen.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title (English)</label>
            <input type="text" name="titleEn" required autoFocus
              placeholder="e.g. Kenya Lakes, Mountains & Forest Trails"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tour Type</label>
              <select name="type" defaultValue="bike"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]">
                <option value="bike">🏍️ Bike Tour</option>
                <option value="private">🦁 Private Safari</option>
                <option value="group">👥 Group Safari</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
              <input type="number" name="durationDays" min={1} defaultValue={8}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]" />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">{error}</p>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: '#7A9A4A' }}>
            {loading ? 'Creating...' : 'Create Tour'}
          </button>
          <Link href="/admin/tours"
            className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
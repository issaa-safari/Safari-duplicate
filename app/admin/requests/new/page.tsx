'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createRequest } from './actions'

export default function NewRequestPage() {
  const [priority, setPriority] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('priority', String(priority))
    try {
      await createRequest(formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/requests" className="text-sm text-gray-500 hover:text-gray-700">
          Back to Requests
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">New Request</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Client Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" required placeholder="client@email.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" name="firstName" required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" name="lastName" required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" name="phone"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input type="text" name="whatsapp"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input type="text" name="country"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select name="language" defaultValue="en"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]">
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Request Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Message</label>
              <textarea name="clientQuestion" rows={3}
                placeholder="Paste their WhatsApp message or email here..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select name="source" defaultValue=""
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]">
                <option value="">Select source...</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="website">Website</option>
                <option value="email">Email</option>
                <option value="instagram">Instagram</option>
                <option value="google">Google</option>
                <option value="facebook">Facebook</option>
                <option value="referral">Referral</option>
                <option value="direct">Direct</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Start Date</label>
                <input type="date" name="preferredDate"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trip Length (nights)</label>
                <input type="number" name="tripLengthNights" min={1} placeholder="e.g. 7"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Room Type</label>
              <select name="preferredRoomType" defaultValue=""
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]">
                <option value="">Not specified</option>
                <option value="sharing">Sharing</option>
                <option value="single">Single</option>
                <option value="family">Family</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Travelers</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Adults</label>
                  <input type="number" name="adults" min={1} defaultValue={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Children 12-18</label>
                  <input type="number" name="childrenOlder" min={0} defaultValue={0}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Children 2-12</label>
                  <input type="number" name="childrenYounger" min={0} defaultValue={0}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="priority" checked={priority}
                onChange={e => setPriority(e.target.checked)}
                className="rounded border-gray-300" />
              <label htmlFor="priority" className="text-sm text-gray-700">
                Mark as priority
              </label>
            </div>
          </div>
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">{error}</p>
        )}
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60 bg-olive hover:bg-olive-dk">
            {loading ? 'Saving...' : 'Save Request'}
          </button>
          <Link href="/admin/requests"
            className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
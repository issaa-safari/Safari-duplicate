'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createDestination } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Toggle } from '@/components/ui/toggle'

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

export default function NewDestinationForm() {
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
      await createDestination(formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/content/destinations" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Destinations
        </Link>
        <h1 className="text-2xl font-semibold text-brand-ink">New Destination</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core details */}
        <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" name="name" required placeholder="e.g. Maasai Mara" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input type="text" name="country" defaultValue="Kenya" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
            <input type="url" name="coverImageUrl" placeholder="https://…" className={inputCls} />
          </div>

          <Toggle checked={isActive} onChange={() => setIsActive(!isActive)} label="Active (visible on website)" />
        </div>

        {/* Content */}
        <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Content</h2>
          <p className="text-xs text-gray-400 -mt-2">Filling in a description or cover image will mark this destination as "With Content".</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
            <textarea name="descriptionEn" rows={4} placeholder="Describe this destination…" className={inputCls} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Arabic)</label>
            <textarea name="descriptionAr" rows={4} placeholder="وصف الوجهة…" dir="rtl" className={inputCls} />
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3">
          <Button type="submit" loading={loading} loadingText="Creating…">Create Destination</Button>
          <ButtonLink href="/admin/content/destinations">Cancel</ButtonLink>
        </div>
      </form>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateDestination } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Toggle } from '@/components/ui/toggle'

interface Destination {
  id: string
  name: string
  country: string
  description_en: string | null
  description_ar: string | null
  cover_image_url: string | null
  is_active: boolean
}

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

export default function DestinationEditForm({ destination }: { destination: Destination }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState(destination.is_active)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('isActive', isActive ? 'true' : 'false')
    try {
      await updateDestination(destination.id, formData)
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
        <h1 className="text-lg font-semibold text-gray-900">Edit Destination</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input id="name" type="text" name="name" required defaultValue={destination.name} className={inputCls} />
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input id="country" type="text" name="country" defaultValue={destination.country} className={inputCls} />
            </div>
          </div>

          <div>
            <label htmlFor="coverImageUrl" className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
            <input id="coverImageUrl"
              type="url"
              name="coverImageUrl"
              defaultValue={destination.cover_image_url ?? ''}
              placeholder="https://…"
              className={inputCls}
            />
          </div>

          <Toggle checked={isActive} onChange={() => setIsActive(!isActive)} label="Active (visible on website)" />
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Content</h2>
          <p className="text-xs text-muted-foreground -mt-2">Filling in a description or cover image will mark this destination as "With Content".</p>

          <div>
            <label htmlFor="descriptionEn" className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
            <textarea id="descriptionEn"
              name="descriptionEn"
              rows={4}
              defaultValue={destination.description_en ?? ''}
              placeholder="Describe this destination…"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="descriptionAr" className="block text-sm font-medium text-gray-700 mb-1">Description (Arabic)</label>
            <textarea id="descriptionAr"
              name="descriptionAr"
              rows={4}
              defaultValue={destination.description_ar ?? ''}
              placeholder="وصف الوجهة…"
              dir="rtl"
              className={inputCls}
            />
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3">
          <Button type="submit" loading={loading} loadingText="Saving…">Save Changes</Button>
          <ButtonLink href="/admin/content/destinations">Cancel</ButtonLink>
        </div>
      </form>
    </div>
  )
}

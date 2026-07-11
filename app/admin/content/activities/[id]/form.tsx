'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateActivity } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Toggle } from '@/components/ui/toggle'

interface Destination { id: string; name: string }
interface Activity {
  id: string
  name: string
  destination_id: string | null
  description_en: string | null
  description_ar: string | null
  cover_image_url: string | null
  is_active: boolean
}

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

export default function ActivityEditForm({
  activity,
  destinations,
}: {
  activity: Activity
  destinations: Destination[]
}) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState(activity.is_active)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('isActive', isActive ? 'true' : 'false')
    try {
      await updateActivity(activity.id, formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/content/activities" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Activities
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Edit Activity</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Details</h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input id="name" type="text" name="name" required defaultValue={activity.name} className={inputCls} />
          </div>

          <div>
            <label htmlFor="destinationId" className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
            <select id="destinationId" name="destinationId" defaultValue={activity.destination_id ?? ''} className={inputCls}>
              <option value="">No destination</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="coverImageUrl" className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
            <input id="coverImageUrl"
              type="url"
              name="coverImageUrl"
              defaultValue={activity.cover_image_url ?? ''}
              placeholder="https://…"
              className={inputCls}
            />
          </div>

          <Toggle checked={isActive} onChange={() => setIsActive(!isActive)} label="Active (visible on website)" />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Content</h2>
          <p className="text-xs text-muted-foreground -mt-2">Filling in a description or cover image marks this as "With Content".</p>

          <div>
            <label htmlFor="descriptionEn" className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
            <textarea id="descriptionEn" name="descriptionEn" rows={4} defaultValue={activity.description_en ?? ''}
              placeholder="Describe this activity…" className={inputCls} />
          </div>

          <div>
            <label htmlFor="descriptionAr" className="block text-sm font-medium text-gray-700 mb-1">Description (Arabic)</label>
            <textarea id="descriptionAr" name="descriptionAr" rows={4} defaultValue={activity.description_ar ?? ''}
              placeholder="وصف هذا النشاط…" dir="rtl" className={inputCls} />
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3">
          <Button type="submit" loading={loading} loadingText="Saving…">Save Changes</Button>
          <ButtonLink href="/admin/content/activities">Cancel</ButtonLink>
        </div>
      </form>
    </div>
  )
}

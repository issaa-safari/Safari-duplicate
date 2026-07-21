'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateDestination } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Toggle } from '@/components/ui/toggle'
import LocationFields from '@/components/admin/location-fields'
import CoverImageField from '@/components/admin/cover-image-field'
import { GalleryUpload } from '@/components/admin/image-upload'

interface Destination {
  id: string
  name: string
  country: string
  description_en: string | null
  description_ar: string | null
  cover_image_url: string | null
  is_active: boolean
  google_maps_url: string | null
  latitude: number | null
  longitude: number | null
  gallery_urls: string[] | null
}

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

export default function DestinationEditForm({ destination }: { destination: Destination }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState(destination.is_active)
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    Array.isArray(destination.gallery_urls) ? destination.gallery_urls : []
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('isActive', isActive ? 'true' : 'false')
    formData.set('galleryUrls', JSON.stringify(galleryUrls))
    try {
      await updateDestination(destination.id, formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/content/destinations" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Destinations
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Edit Destination</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core details */}
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Name <span className="text-destructive">*</span></label>
              <input id="name" type="text" name="name" required defaultValue={destination.name} className={inputCls} />
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-foreground mb-1">Country</label>
              <input id="country" type="text" name="country" defaultValue={destination.country} className={inputCls} />
            </div>
          </div>

          <CoverImageField
            initialUrl={destination.cover_image_url}
            folder={`destinations/${destination.id}`}
          />

          <Toggle checked={isActive} onChange={() => setIsActive(!isActive)} label="Active (visible on website)" />
        </div>

        {/* Location (itinerary map) */}
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Location</h2>
          <LocationFields
            googleMapsUrl={destination.google_maps_url}
            latitude={destination.latitude}
            longitude={destination.longitude}
          />
        </div>

        {/* Content */}
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Content</h2>
          <p className="text-xs text-muted-foreground -mt-2">Filling in a description or cover image will mark this destination as "With Content".</p>

          <div>
            <label htmlFor="descriptionEn" className="block text-sm font-medium text-foreground mb-1">Description (English)</label>
            <textarea id="descriptionEn"
              name="descriptionEn"
              rows={4}
              defaultValue={destination.description_en ?? ''}
              placeholder="Describe this destination…"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="descriptionAr" className="block text-sm font-medium text-foreground mb-1">Description (Arabic)</label>
            <textarea id="descriptionAr"
              name="descriptionAr"
              rows={4}
              defaultValue={destination.description_ar ?? ''}
              placeholder="وصف الوجهة…"
              dir="rtl"
              className={inputCls}
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-foreground mb-1">Gallery photos</span>
            <GalleryUpload
              value={galleryUrls}
              onChange={setGalleryUrls}
              folder={`destinations/${destination.id}`}
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

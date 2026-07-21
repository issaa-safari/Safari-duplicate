'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createAccommodation } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Toggle } from '@/components/ui/toggle'
import LocationFields from '@/components/admin/location-fields'
import CoverImageField from '@/components/admin/cover-image-field'
import { GalleryUpload } from '@/components/admin/image-upload'

interface Destination { id: string; name: string }

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

export default function NewAccommodationForm({ destinations }: { destinations: Destination[] }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [galleryUrls, setGalleryUrls] = useState<string[]>([])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('isActive', isActive ? 'true' : 'false')
    formData.set('galleryUrls', JSON.stringify(galleryUrls))
    try {
      await createAccommodation(formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/content/accommodations" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Accommodations
        </Link>
        <h1 className="text-xl font-semibold text-foreground">New Accommodation</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Details</h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Name <span className="text-destructive">*</span></label>
            <input id="name" type="text" name="name" required placeholder="e.g. Mahali Mzuri" className={inputCls} />
          </div>

          <div>
            <label htmlFor="destinationId" className="block text-sm font-medium text-foreground mb-1">Destination</label>
            <select id="destinationId" name="destinationId" defaultValue="" className={inputCls}>
              <option value="">No destination</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-foreground mb-1">Type</label>
              <select id="type" name="type" defaultValue="hotel" className={inputCls}>
                <option value="hotel">Hotel</option>
                <option value="lodge">Lodge</option>
                <option value="camp">Camp</option>
                <option value="villa">Villa</option>
                <option value="guesthouse">Guesthouse</option>
              </select>
            </div>
            <div>
              <label htmlFor="budgetTier" className="block text-sm font-medium text-foreground mb-1">Budget Tier</label>
              <select id="budgetTier" name="budgetTier" defaultValue="luxury" className={inputCls}>
                <option value="budget">Budget</option>
                <option value="midrange">Mid-range</option>
                <option value="luxury">Luxury</option>
                <option value="ultra">Ultra-luxury</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rating" className="block text-sm font-medium text-foreground mb-1">Rating (1–5)</label>
              <input id="rating" type="number" name="rating" min={1} max={5} defaultValue={4} className={inputCls} />
            </div>
            <div>
              <CoverImageField folder="accommodations/covers" />
            </div>
          </div>

          <Toggle checked={isActive} onChange={() => setIsActive(!isActive)} label="Active (visible on website)" />
        </div>

        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Location</h2>
          <LocationFields />
        </div>

        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Content</h2>
          <p className="text-xs text-muted-foreground -mt-2">Filling in a description or cover image marks this as "With Content".</p>

          <div>
            <label htmlFor="descriptionEn" className="block text-sm font-medium text-foreground mb-1">Description (English)</label>
            <textarea id="descriptionEn" name="descriptionEn" rows={4} placeholder="Describe this accommodation…" className={inputCls} />
          </div>

          <div>
            <label htmlFor="descriptionAr" className="block text-sm font-medium text-foreground mb-1">Description (Arabic)</label>
            <textarea id="descriptionAr" name="descriptionAr" rows={4} placeholder="وصف مكان الإقامة…" dir="rtl" className={inputCls} />
          </div>

          <div>
            <span className="block text-sm font-medium text-foreground mb-1">Gallery photos</span>
            <p className="text-xs text-muted-foreground mb-2">
              Shown in the client proposal&apos;s accommodation block when the itinerary day has no custom photos.
            </p>
            <GalleryUpload
              value={galleryUrls}
              onChange={setGalleryUrls}
              folder="accommodations/gallery"
            />
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3">
          <Button type="submit" loading={loading} loadingText="Creating…">Create Accommodation</Button>
          <ButtonLink href="/admin/content/accommodations">Cancel</ButtonLink>
        </div>
      </form>
    </div>
  )
}

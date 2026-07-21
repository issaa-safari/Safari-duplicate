'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { createPark } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Toggle } from '@/components/ui/toggle'
import LocationFields from '@/components/admin/location-fields'
import CoverImageField from '@/components/admin/cover-image-field'
import { GalleryUpload } from '@/components/admin/image-upload'

const PARK_TYPES = [
  { value: 'national_park',  label: 'National Park' },
  { value: 'game_reserve',   label: 'Game Reserve' },
  { value: 'conservancy',    label: 'Conservancy' },
  { value: 'marine_park',    label: 'Marine Park' },
  { value: 'forest_reserve', label: 'Forest Reserve' },
  { value: 'other',          label: 'Other' },
]

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

export default function NewParkForm() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [galleryUrls, setGalleryUrls] = useState<string[]>([])
  const nameRef = useRef<HTMLInputElement>(null)

  // A picked Google Maps place fills the name only while it's still empty.
  function onPlaceSelected(place: { name: string }) {
    if (nameRef.current && !nameRef.current.value.trim()) nameRef.current.value = place.name
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('isActive', isActive ? 'true' : 'false')
    formData.set('galleryUrls', JSON.stringify(galleryUrls))
    try {
      await createPark(formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/content/parks" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Parks
        </Link>
        <h1 className="text-xl font-semibold text-foreground">New Park / Reserve</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Details</h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Name <span className="text-destructive">*</span></label>
            <input id="name" ref={nameRef} type="text" name="name" required placeholder="e.g. Serengeti National Park" className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-foreground mb-1">Country</label>
              <input id="country" type="text" name="country" defaultValue="Tanzania" placeholder="e.g. Tanzania" className={inputCls} />
            </div>
            <div>
              <label htmlFor="parkType" className="block text-sm font-medium text-foreground mb-1">Type</label>
              <select id="parkType" name="parkType" defaultValue="national_park" className={inputCls}>
                {PARK_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <CoverImageField folder="parks/covers" />

          <Toggle checked={isActive} onChange={() => setIsActive(!isActive)} label="Active (appears in rate picker)" />
        </div>

        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Location</h2>
          <LocationFields onPlaceSelected={onPlaceSelected} />
        </div>

        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Description</h2>

          <div>
            <label htmlFor="descriptionEn" className="block text-sm font-medium text-foreground mb-1">Description (English)</label>
            <textarea id="descriptionEn" name="descriptionEn" rows={4} placeholder="Brief description of the park…" className={inputCls} />
          </div>

          <div>
            <span className="block text-sm font-medium text-foreground mb-1">Gallery photos</span>
            <GalleryUpload
              value={galleryUrls}
              onChange={setGalleryUrls}
              folder="parks/gallery"
            />
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3">
          <Button type="submit" loading={loading} loadingText="Creating…">Create Park</Button>
          <ButtonLink href="/admin/content/parks">Cancel</ButtonLink>
        </div>
      </form>
    </div>
  )
}

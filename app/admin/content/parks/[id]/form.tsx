'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updatePark, deletePark } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Toggle } from '@/components/ui/toggle'

const PARK_TYPES = [
  { value: 'national_park',  label: 'National Park' },
  { value: 'game_reserve',   label: 'Game Reserve' },
  { value: 'conservancy',    label: 'Conservancy' },
  { value: 'marine_park',    label: 'Marine Park' },
  { value: 'forest_reserve', label: 'Forest Reserve' },
  { value: 'other',          label: 'Other' },
]

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

interface Park {
  id: string
  name: string
  country: string
  park_type: string
  description_en: string | null
  cover_image_url: string | null
  is_active: boolean
}

export default function ParkEditForm({ park }: { park: Park }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isActive, setIsActive] = useState(park.is_active)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('isActive', isActive ? 'true' : 'false')
    formData.set('id', park.id)
    try {
      await updatePark(formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this park? This cannot be undone. Any linked rate cards will also be affected.')) return
    setDeleting(true)
    const fd = new FormData()
    fd.set('id', park.id)
    try {
      await deletePark(fd)
    } catch (err: any) {
      setError(err.message ?? 'Failed to delete.')
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/content/parks" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Parks
        </Link>
        <h1 className="text-xl font-semibold text-foreground">{park.name}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Details</h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Name <span className="text-red-500">*</span></label>
            <input id="name" type="text" name="name" required defaultValue={park.name} className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-foreground mb-1">Country</label>
              <input id="country" type="text" name="country" defaultValue={park.country} className={inputCls} />
            </div>
            <div>
              <label htmlFor="parkType" className="block text-sm font-medium text-foreground mb-1">Type</label>
              <select id="parkType" name="parkType" defaultValue={park.park_type} className={inputCls}>
                {PARK_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="coverImageUrl" className="block text-sm font-medium text-foreground mb-1">Cover Image URL</label>
            <input id="coverImageUrl" type="url" name="coverImageUrl" defaultValue={park.cover_image_url ?? ''} placeholder="https://…" className={inputCls} />
          </div>

          <Toggle checked={isActive} onChange={() => setIsActive(!isActive)} label="Active (appears in rate picker)" />
        </div>

        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Description</h2>
          <div>
            <label htmlFor="descriptionEn" className="block text-sm font-medium text-foreground mb-1">Description (English)</label>
            <textarea id="descriptionEn" name="descriptionEn" rows={4} defaultValue={park.description_en ?? ''} placeholder="Brief description of the park…" className={inputCls} />
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <Button type="submit" loading={loading} loadingText="Saving…">Save Changes</Button>
            <ButtonLink href="/admin/content/parks">Cancel</ButtonLink>
          </div>
          <Button type="button" variant="danger-text" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </form>
    </div>
  )
}

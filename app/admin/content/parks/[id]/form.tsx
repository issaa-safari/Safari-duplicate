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

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

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
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/content/parks" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Parks
        </Link>
        <h1 className="text-2xl font-semibold text-brand-ink">{park.name}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" name="name" required defaultValue={park.name} className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input type="text" name="country" defaultValue={park.country} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select name="parkType" defaultValue={park.park_type} className={inputCls}>
                {PARK_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
            <input type="url" name="coverImageUrl" defaultValue={park.cover_image_url ?? ''} placeholder="https://…" className={inputCls} />
          </div>

          <Toggle checked={isActive} onChange={() => setIsActive(!isActive)} label="Active (appears in rate picker)" />
        </div>

        <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Description</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
            <textarea name="descriptionEn" rows={4} defaultValue={park.description_en ?? ''} placeholder="Brief description of the park…" className={inputCls} />
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

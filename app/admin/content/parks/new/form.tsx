'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createPark } from './actions'

const PARK_TYPES = [
  { value: 'national_park',  label: 'National Park' },
  { value: 'game_reserve',   label: 'Game Reserve' },
  { value: 'conservancy',    label: 'Conservancy' },
  { value: 'marine_park',    label: 'Marine Park' },
  { value: 'forest_reserve', label: 'Forest Reserve' },
  { value: 'other',          label: 'Other' },
]

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]'

export default function NewParkForm() {
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
      await createPark(formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/content/parks" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Parks
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">New Park / Reserve</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" name="name" required placeholder="e.g. Serengeti National Park" className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input type="text" name="country" defaultValue="Tanzania" placeholder="e.g. Tanzania" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select name="parkType" defaultValue="national_park" className={inputCls}>
                {PARK_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
            <input type="url" name="coverImageUrl" placeholder="https://…" className={inputCls} />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ' +
                (isActive ? 'bg-[#7A9A4A]' : 'bg-gray-300')}>
              <span className={'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ' +
                (isActive ? 'translate-x-4' : 'translate-x-0')} />
            </button>
            <span className="text-sm text-gray-700">Active (appears in rate picker)</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Description</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
            <textarea name="descriptionEn" rows={4} placeholder="Brief description of the park…" className={inputCls} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: '#7A9A4A' }}>
            {loading ? 'Creating…' : 'Create Park'}
          </button>
          <Link href="/admin/content/parks"
            className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

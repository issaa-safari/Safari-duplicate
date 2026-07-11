'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createActivity } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Toggle } from '@/components/ui/toggle'

interface Destination { id: string; name: string }

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

export default function NewActivityForm({ destinations }: { destinations: Destination[] }) {
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
      await createActivity(formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/content/activities" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Activities
        </Link>
        <h1 className="text-xl font-semibold text-foreground">New Activity</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Details</h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Name <span className="text-red-500">*</span></label>
            <input id="name" type="text" name="name" required placeholder="e.g. Hot Air Balloon Safari" className={inputCls} />
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

          <div>
            <label htmlFor="coverImageUrl" className="block text-sm font-medium text-foreground mb-1">Cover Image URL</label>
            <input id="coverImageUrl" type="url" name="coverImageUrl" placeholder="https://…" className={inputCls} />
          </div>

          <Toggle checked={isActive} onChange={() => setIsActive(!isActive)} label="Active (visible on website)" />
        </div>

        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Content</h2>
          <p className="text-xs text-muted-foreground -mt-2">Filling in a description or cover image marks this as "With Content".</p>

          <div>
            <label htmlFor="descriptionEn" className="block text-sm font-medium text-foreground mb-1">Description (English)</label>
            <textarea id="descriptionEn" name="descriptionEn" rows={4} placeholder="Describe this activity…" className={inputCls} />
          </div>

          <div>
            <label htmlFor="descriptionAr" className="block text-sm font-medium text-foreground mb-1">Description (Arabic)</label>
            <textarea id="descriptionAr" name="descriptionAr" rows={4} placeholder="وصف هذا النشاط…" dir="rtl" className={inputCls} />
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3">
          <Button type="submit" loading={loading} loadingText="Creating…">Create Activity</Button>
          <ButtonLink href="/admin/content/activities">Cancel</ButtonLink>
        </div>
      </form>
    </div>
  )
}

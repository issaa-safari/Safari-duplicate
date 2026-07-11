'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createStaffMember } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Toggle } from '@/components/ui/toggle'

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

export default function NewStaffForm() {
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
      await createStaffMember(formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/content/staff" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Tour Staff
        </Link>
        <h1 className="text-xl font-semibold text-foreground">New Staff Member</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-surface shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Name <span className="text-destructive">*</span></label>
              <input id="name" type="text" name="name" required placeholder="Full name" className={inputCls} />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-foreground mb-1">Role</label>
              <select id="role" name="role" defaultValue="guide" className={inputCls}>
                <option value="guide">Guide</option>
                <option value="driver">Driver</option>
                <option value="chef">Chef</option>
                <option value="coordinator">Coordinator</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">Phone</label>
              <input id="phone" type="tel" name="phone" placeholder="+254…" className={inputCls} />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input id="email" type="email" name="email" placeholder="name@example.com" className={inputCls} />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1">Notes</label>
            <textarea id="notes" name="notes" rows={3} placeholder="Languages, certifications, availability notes…" className={inputCls} />
          </div>

          <Toggle checked={isActive} onChange={() => setIsActive(!isActive)} label="Active" />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3">
          <Button type="submit" loading={loading} loadingText="Creating…">Create Staff Member</Button>
          <ButtonLink href="/admin/content/staff">Cancel</ButtonLink>
        </div>
      </form>
    </div>
  )
}

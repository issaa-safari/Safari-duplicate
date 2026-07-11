'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateStaffMember } from './actions'
import { Button, ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Toggle } from '@/components/ui/toggle'

interface StaffMember {
  id: string
  name: string
  role: string
  phone: string | null
  email: string | null
  notes: string | null
  is_active: boolean
}

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'

export default function StaffEditForm({ member }: { member: StaffMember }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isActive, setIsActive] = useState(member.is_active)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('isActive', isActive ? 'true' : 'false')
    try {
      await updateStaffMember(member.id, formData)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/content/staff" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Tour Staff
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Edit Staff Member</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Details</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input id="name" type="text" name="name" required defaultValue={member.name} className={inputCls} />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select id="role" name="role" defaultValue={member.role} className={inputCls}>
                <option value="guide">Guide</option>
                <option value="driver">Driver</option>
                <option value="chef">Chef</option>
                <option value="coordinator">Coordinator</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input id="phone" type="tel" name="phone" defaultValue={member.phone ?? ''} placeholder="+254…" className={inputCls} />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input id="email" type="email" name="email" defaultValue={member.email ?? ''} placeholder="name@example.com" className={inputCls} />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea id="notes" name="notes" rows={3} defaultValue={member.notes ?? ''}
              placeholder="Languages, certifications, availability notes…" className={inputCls} />
          </div>

          <Toggle checked={isActive} onChange={() => setIsActive(!isActive)} label="Active" />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-3">
          <Button type="submit" loading={loading} loadingText="Saving…">Save Changes</Button>
          <ButtonLink href="/admin/content/staff">Cancel</ButtonLink>
        </div>
      </form>
    </div>
  )
}

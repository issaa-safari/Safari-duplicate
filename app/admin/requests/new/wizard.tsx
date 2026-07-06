'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createRequestStep1, updateRequestStep2 } from './actions'
import StartFromTemplate from '../[id]/start-from-template'

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

interface TemplateOption { id: string; label: string }

function StepDots({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-6 text-xs font-medium">
      <span className={step === 1 ? 'text-[var(--olive-dk)]' : 'text-gray-400'}>1 · Client &amp; source</span>
      <span className="h-px w-8 bg-gray-300" />
      <span className={step === 2 ? 'text-[var(--olive-dk)]' : 'text-gray-400'}>2 · Tour details</span>
    </div>
  )
}

export default function NewRequestWizard({ templates }: { templates: TemplateOption[] }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [priority, setPriority] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<{ requestId: string; reference: string } | null>(null)

  async function handleStep1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const result = await createRequestStep1(new FormData(e.currentTarget))
      setCreated(result)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleStep2(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.set('requestId', created!.requestId)
    fd.set('priority', String(priority))
    try {
      await updateRequestStep2(fd) // redirects on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/requests" className="text-sm text-gray-500 hover:text-gray-700">Back to Requests</Link>
        <h1 className="text-lg font-semibold text-gray-900">New Request</h1>
        {created && <span className="text-xs font-mono text-[var(--olive-dk)] bg-[var(--olive)]/10 px-2 py-0.5 rounded-full">{created.reference}</span>}
      </div>

      <StepDots step={step} />

      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Client Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Email</label>
                <input type="email" name="email" required placeholder="client@email.com" className={inputCls} />
              </div>
              <div><label className={labelCls}>First Name</label><input type="text" name="firstName" required className={inputCls} /></div>
              <div><label className={labelCls}>Last Name</label><input type="text" name="lastName" required className={inputCls} /></div>
              <div><label className={labelCls}>Phone</label><input type="text" name="phone" className={inputCls} /></div>
              <div><label className={labelCls}>WhatsApp</label><input type="text" name="whatsapp" className={inputCls} /></div>
              <div><label className={labelCls}>Country</label><input type="text" name="country" className={inputCls} /></div>
              <div>
                <label className={labelCls}>Language</label>
                <select name="language" defaultValue="en" className={inputCls}>
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Source</label>
                <select name="source" defaultValue="" className={inputCls}>
                  <option value="">Select source…</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="website">Website</option>
                  <option value="email">Email</option>
                  <option value="instagram">Instagram</option>
                  <option value="google">Google</option>
                  <option value="facebook">Facebook</option>
                  <option value="referral">Referral</option>
                  <option value="direct">Direct</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60 bg-olive hover:bg-olive-dk">
              {loading ? 'Saving…' : 'Continue →'}
            </button>
            <Link href="/admin/requests" className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</Link>
          </div>
        </form>
      )}

      {step === 2 && created && (
        <form onSubmit={handleStep2} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Request Details</h2>
            <div>
              <label className={labelCls}>Client Message</label>
              <textarea name="clientQuestion" rows={3} placeholder="Paste their WhatsApp message or email here…" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Preferred Start Date</label>
              <input type="date" name="preferredDate" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Travelers</label>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs text-gray-500 mb-1">Adults</label><input type="number" name="adults" min={1} defaultValue={2} className={inputCls} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Children 12–18</label><input type="number" name="childrenOlder" min={0} defaultValue={0} className={inputCls} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Children 2–12</label><input type="number" name="childrenYounger" min={0} defaultValue={0} className={inputCls} /></div>
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input type="checkbox" checked={priority} onChange={e => setPriority(e.target.checked)} className="rounded border-gray-300" />
              Mark as priority
            </label>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Start from a tour template <span className="font-normal text-gray-400">(optional)</span></h2>
            <p className="text-xs text-gray-500 mb-3">Copies a saved itinerary + pricing into a new quote for this request.</p>
            <StartFromTemplate requestId={created.requestId} templates={templates} />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60 bg-olive hover:bg-olive-dk">
              {loading ? 'Saving…' : 'Finish'}
            </button>
            <Link href={`/admin/requests/${created.requestId}`} className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Skip &amp; open request
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}

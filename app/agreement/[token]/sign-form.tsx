'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignForm({ token, defaultName }: { token: string; defaultName: string }) {
  const router = useRouter()
  const [name, setName] = useState(defaultName)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Please type your full name.'); return }
    if (!agreed) { setError('Please tick the box to confirm you agree.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/agreement/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signedName: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not submit. Please try again.'); setSubmitting(false); return }
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <label className="block text-sm font-medium text-gray-700 mb-1">Type your full name to sign</label>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Full legal name"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
      />
      <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5" />
        <span>I have read and agree to all terms, policies and the release of liability set out above.</span>
      </label>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Agree & sign'}
      </button>
      <p className="mt-3 text-center text-xs text-gray-400">
        Signing records your name, the date, and your device details as an electronic signature.
      </p>
    </form>
  )
}

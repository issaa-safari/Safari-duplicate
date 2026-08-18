'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const G = '#7A9A4A'

export default function ResetPasswordForm({ next }: { next: string }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setBusy(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setBusy(false)
      return
    }

    // The reset is already complete at this point — signing out and sending
    // the account back through a fresh login is deliberate, not a leftover
    // step. A recovery link that leaked or was reused in a narrow window
    // shouldn't double as a free session once the password it was meant to
    // fix has already been changed.
    await supabase.auth.signOut()
    const loginHref = next.startsWith('/admin')
      ? '/admin/login?reset=1'
      : `/login?reset=1&redirect=${encodeURIComponent(next)}`
    window.location.assign(loginHref)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Set a new password</h1>
        <p className="mt-2 text-sm text-gray-600">Choose a new password for your account.</p>

        {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="block text-xs text-gray-600 mb-1">New password</span>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
            />
            <span className="mt-1 block text-xs text-gray-500">At least 6 characters</span>
          </label>
          <label className="block">
            <span className="block text-xs text-gray-600 mb-1">Confirm new password</span>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: G }}
          >
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}

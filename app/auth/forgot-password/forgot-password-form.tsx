'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const G = '#7A9A4A'

export default function ForgotPasswordForm({ next }: { next: string }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)

    try {
      const supabase = createClient()
      // Reuses /auth/callback for the code exchange rather than a second
      // handler — the browser client defaults to the PKCE flow, so this link
      // lands with the same `?code=` shape an OAuth sign-in does.
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          `/auth/reset-password?next=${encodeURIComponent(next)}`
        )}`,
      })
    } catch {
      // Fall through to the same success state below regardless — see the
      // comment on `sent`.
    } finally {
      setBusy(false)
      // Always show the same outcome, whether or not the address has an
      // account and whether or not the call itself errored — a
      // request-a-reset form is exactly the kind of page that must not let a
      // visitor tell which emails are registered.
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Reset your password</h1>

        {sent ? (
          <>
            <p className="mt-4 text-sm text-gray-600">
              If <span className="font-medium text-gray-900">{email}</span> has an account,
              we&rsquo;ve sent a link to reset the password. It expires after a while — request
              another if it&rsquo;s gone stale.
            </p>
            <Link href="/admin/login" className="mt-6 block text-center text-sm hover:underline" style={{ color: G }}>
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-600">
              Enter the email on the account and we&rsquo;ll send a link to set a new password.
            </p>
            <form className="mt-6" onSubmit={submit}>
              <label className="block">
                <span className="block text-xs text-gray-600 mb-1">Email</span>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                />
              </label>
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: G }}
              >
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

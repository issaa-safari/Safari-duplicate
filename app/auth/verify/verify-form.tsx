'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const G = '#7A9A4A'

export default function VerifyForm({ next }: { next: string }) {
  const [loading, setLoading] = useState(true)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // createClient() returns the shared browser client (a singleton keyed to
    // the cookie session), so calling it here and in the handlers is safe.
    const client = createClient()
    let cancelled = false
    ;(async () => {
      const { data, error } = await client.auth.mfa.listFactors()
      if (cancelled) return
      if (error) { setError(error.message); setLoading(false); return }
      const totp = (data?.totp ?? [])[0]
      if (!totp) {
        // Nothing to verify (factor removed elsewhere) — session is as elevated
        // as it can be, so continue to the destination.
        window.location.assign(next)
        return
      }
      setFactorId(totp.id)
      const { data: challenge, error: cErr } = await client.auth.mfa.challenge({ factorId: totp.id })
      if (cancelled) return
      if (cErr || !challenge) {
        setError(cErr?.message ?? 'Could not start verification.')
        setLoading(false)
        return
      }
      setChallengeId(challenge.id)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [next])

  async function submit() {
    if (!factorId || !challengeId) return
    const supabase = createClient()
    setBusy(true); setError('')
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code: code.trim() })
    if (error) {
      setError(error.message)
      setCode('')
      // A consumed/expired challenge can't be reused — start a fresh one so the
      // user can retry without reloading.
      const { data: challenge } = await supabase.auth.mfa.challenge({ factorId })
      setChallengeId(challenge?.id ?? null)
      setBusy(false)
      return
    }
    // Session is now AAL2. Use a full navigation so middleware re-reads the
    // refreshed cookies and lets the destination through.
    window.location.assign(next)
  }

  async function signOut() {
    await createClient().auth.signOut()
    window.location.assign('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Two-factor verification</h1>
        <p className="mt-2 text-sm text-gray-600">
          Enter the 6-digit code from your authenticator app to continue.
        </p>

        {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

        {loading ? (
          <p className="mt-6 text-sm text-gray-500">Preparing verification…</p>
        ) : (
          <form
            className="mt-6"
            onSubmit={(e) => { e.preventDefault(); submit() }}
          >
            <label className="block">
              <span className="block text-xs text-gray-600 mb-1">6-digit code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                maxLength={6}
                autoFocus
                placeholder="123456"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-[0.4em] focus:outline-none focus:ring-2"
              />
            </label>
            <button
              type="submit"
              disabled={busy || code.trim().length < 6 || !challengeId}
              className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: G }}
            >
              {busy ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={signOut}
          className="mt-4 w-full text-xs text-gray-500 hover:text-gray-700"
        >
          Sign in with a different account
        </button>
      </div>
    </div>
  )
}

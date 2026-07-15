'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

const G = '#7A9A4A'

type Factor = { id: string; status: string; friendly_name?: string | null }

export default function TwoFactor() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [factors, setFactors] = useState<Factor[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Enrolment-in-progress state
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async (client: SupabaseClient) => {
    setLoading(true)
    const { data, error } = await client.auth.mfa.listFactors()
    if (error) setError(error.message)
    else setFactors((data?.totp ?? []) as Factor[])
    setLoading(false)
  }, [])

  useEffect(() => {
    const client = createClient()
    setSupabase(client)
    refresh(client)
  }, [refresh])

  const verified = factors.find((f) => f.status === 'verified')

  async function startEnroll() {
    if (!supabase) return
    setError(''); setNotice(''); setBusy(true)
    // Clear any stale unverified factors first (Supabase blocks duplicate enrol).
    for (const f of factors.filter((f) => f.status !== 'verified')) {
      await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    setBusy(false)
    if (error) { setError(error.message); return }
    setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
  }

  async function confirmEnroll() {
    if (!supabase || !enroll) return
    setError(''); setBusy(true)
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enroll.factorId })
    if (cErr || !challenge) { setError(cErr?.message ?? 'Could not start verification.'); setBusy(false); return }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enroll.factorId,
      challengeId: challenge.id,
      code: code.trim(),
    })
    setBusy(false)
    if (vErr) { setError(vErr.message); return }
    setEnroll(null); setCode(''); setNotice('Two-factor authentication is now enabled.')
    await refresh(supabase)
  }

  async function cancelEnroll() {
    if (supabase && enroll) await supabase.auth.mfa.unenroll({ factorId: enroll.factorId })
    setEnroll(null); setCode(''); setError('')
  }

  async function disable() {
    if (!supabase || !verified) return
    setBusy(true); setError('')
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id })
    setBusy(false)
    if (error) { setError(error.message); return }
    setNotice('Two-factor authentication disabled.')
    await refresh(supabase)
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Two-Factor Authentication</h3>
      <p className="text-sm text-gray-600 mb-4">
        Add an extra layer of security using an authenticator app (Google Authenticator, Authy, 1Password…).
      </p>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-3">{error}</p>}
      {notice && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3 mb-3">{notice}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Checking status…</p>
      ) : verified ? (
        <div className="flex items-center justify-between gap-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-900 font-medium">✓ Two-factor authentication is enabled.</p>
          <button type="button" onClick={disable} disabled={busy}
            className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-60">
            {busy ? 'Working…' : 'Disable'}
          </button>
        </div>
      ) : enroll ? (
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-700 mb-3">Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
          {/* Supabase returns the QR as an SVG data URI */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qr} alt="Two-factor QR code" className="h-40 w-40 bg-white" />
          <p className="text-xs text-gray-500 mt-2">Can’t scan? Enter this key manually: <code className="font-mono">{enroll.secret}</code></p>
          <div className="flex items-end gap-2 mt-4">
            <label className="block">
              <span className="block text-xs text-gray-600 mb-1">6-digit code</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6}
                placeholder="123456"
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-widest focus:outline-none focus:ring-2" />
            </label>
            <button type="button" onClick={confirmEnroll} disabled={busy || code.trim().length < 6}
              className="px-4 py-2 rounded-lg font-medium text-white disabled:opacity-60" style={{ backgroundColor: G }}>
              {busy ? 'Verifying…' : 'Verify & enable'}
            </button>
            <button type="button" onClick={cancelEnroll} disabled={busy}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startEnroll} disabled={busy}
          className="px-6 py-2.5 rounded-lg font-medium text-white disabled:opacity-60" style={{ backgroundColor: G }}>
          {busy ? 'Starting…' : 'Enable two-factor'}
        </button>
      )}
    </div>
  )
}

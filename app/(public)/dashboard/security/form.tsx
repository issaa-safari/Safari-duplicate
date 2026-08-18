'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, SupabaseClient } from '@supabase/supabase-js'
import { useLocale } from '@/lib/use-locale'

const G = '#7A9A4A'

export default function SecurityForm({ user }: { user: User }) {
  const isAr = useLocale() === 'ar'
  const t = isAr ? {
    initFailed: 'تعذّر التحميل. حدّث الصفحة وحاول مرة أخرى.',
    mismatch: 'كلمتا المرور غير متطابقتين',
    tooShort: 'يجب ألا تقل كلمة المرور عن 6 أحرف',
    wrongCurrent: 'كلمة المرور الحالية غير صحيحة.',
    updated: 'تم تحديث كلمة المرور!',
    failed: 'حدث خطأ. حاول مرة أخرى.',
    change: 'تغيير كلمة المرور',
    current: 'كلمة المرور الحالية', next: 'كلمة المرور الجديدة',
    confirm: 'تأكيد كلمة المرور الجديدة',
    updating: 'جارٍ التحديث…', update: 'تحديث كلمة المرور',
  } : {
    initFailed: 'Failed to initialize. Please refresh and try again.',
    mismatch: 'New passwords do not match',
    tooShort: 'Password must be at least 6 characters',
    wrongCurrent: 'Current password is incorrect.',
    updated: 'Password updated successfully!',
    failed: 'An error occurred. Please try again.',
    change: 'Change Password',
    current: 'Current Password', next: 'New Password',
    confirm: 'Confirm New Password',
    updating: 'Updating…', update: 'Update Password',
  }

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    setSupabase(createClient())
  }, [])
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!supabase) {
      setError(t.initFailed)
      setLoading(false)
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError(t.mismatch)
      setLoading(false)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setError(t.tooShort)
      setLoading(false)
      return
    }

    try {
      // Prove the caller actually knows the current password before honouring
      // a change. Without this, anyone with a live session — an unattended
      // logged-in browser, say — could change the password with zero
      // knowledge of the old one, which is not what this field's presence
      // implies to whoever is filling it in.
      if (!user.email) {
        setError(t.failed)
        setLoading(false)
        return
      }
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForm.currentPassword,
      })
      if (verifyError) {
        setError(t.wrongCurrent)
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setSuccess(t.updated)
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setLoading(false)
    } catch (err) {
      setError(t.failed)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handlePasswordSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.change}</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.current}</label>
          <input
            type="password"
            required
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            placeholder="••••••••"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.next}</label>
          <input
            type="password"
            required
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            placeholder="••••••••"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">At least 6 characters</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.confirm}</label>
          <input
            type="password"
            required
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            placeholder="••••••••"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>
      )}

      {success && (
        <p className="text-sm text-green-600 bg-green-50 rounded-lg px-4 py-3">{success}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-lg font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: G }}
        >
          {loading ? t.updating : t.update}
        </button>
      </div>
    </form>
  )
}

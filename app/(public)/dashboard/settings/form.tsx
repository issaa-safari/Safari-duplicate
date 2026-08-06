'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, SupabaseClient } from '@supabase/supabase-js'
import { deriveName } from '@/lib/user-name'
import { useLocale } from '@/lib/use-locale'

const G = '#7A9A4A'

export default function SettingsForm({ user }: { user: User }) {
  const isAr = useLocale() === 'ar'
  const t = isAr ? {
    initFailed: 'تعذّر التحميل. حدّث الصفحة وحاول مرة أخرى.',
    saved: 'تم تحديث ملفك الشخصي!',
    failed: 'حدث خطأ. حاول مرة أخرى.',
    personal: 'المعلومات الشخصية',
    firstName: 'الاسم الأول', lastName: 'اسم العائلة',
    email: 'البريد الإلكتروني', emailLocked: 'لا يمكن تغيير البريد الإلكتروني',
    phone: 'رقم الهاتف', saving: 'جارٍ الحفظ…', save: 'حفظ التغييرات',
  } : {
    initFailed: 'Failed to initialize. Please refresh and try again.',
    saved: 'Profile updated successfully!',
    failed: 'An error occurred. Please try again.',
    personal: 'Personal Information',
    firstName: 'First Name', lastName: 'Last Name',
    email: 'Email', emailLocked: 'Email cannot be changed',
    phone: 'Phone Number', saving: 'Saving…', save: 'Save Changes',
  }
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    setSupabase(createClient())
  }, [])
  const derived = deriveName(user.user_metadata)
  const [formData, setFormData] = useState({
    firstName: derived.firstName,
    lastName: derived.lastName,
    email: user.email || '',
    phone: user.user_metadata?.phone || '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!supabase) {
      setError(t.initFailed)
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setSuccess(t.saved)
      setLoading(false)
    } catch (err) {
      setError(t.failed)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.personal}</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.firstName}</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.lastName}</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.email}</label>
          <input
            type="email"
            value={formData.email}
            disabled
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm bg-gray-50 text-gray-600"
          />
          <p className="text-xs text-gray-500 mt-1">{t.emailLocked}</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t.phone}</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
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
          {loading ? t.saving : t.save}
        </button>
      </div>
    </form>
  )
}

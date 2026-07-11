'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import { SupabaseClient } from '@supabase/supabase-js'
import { useLocale } from '@/lib/use-locale'

const G = '#7A9A4A'

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterInner />
    </Suspense>
  )
}

function RegisterInner() {
  const router = useRouter()
  const locale = useLocale()
  const isAr = locale === 'ar'
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    setSupabase(createClient())
  }, [])

  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', firstName: '', lastName: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const t = isAr ? {
    title: 'إنشاء حساب', subtitle: 'احجز مغامرة السفاري القادمة',
    signupGoogle: 'التسجيل باستخدام Google', or: 'أو',
    firstName: 'الاسم الأول', lastName: 'اسم العائلة', email: 'البريد الإلكتروني',
    password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور', creating: 'جارٍ إنشاء الحساب...',
    create: 'إنشاء حساب', haveAccount: 'لديك حساب بالفعل؟', signIn: 'تسجيل الدخول',
    initError: 'فشل التهيئة. حدّث الصفحة وحاول مرة أخرى.', mismatch: 'كلمتا المرور غير متطابقتين',
    genericError: 'حدث خطأ. حاول مرة أخرى.',
  } : {
    title: 'Create Account', subtitle: 'Book your next safari adventure',
    signupGoogle: 'Sign up with Google', or: 'or',
    firstName: 'First Name', lastName: 'Last Name', email: 'Email',
    password: 'Password', confirm: 'Confirm Password', creating: 'Creating account…',
    create: 'Create Account', haveAccount: 'Already have an account?', signIn: 'Sign in',
    initError: 'Failed to initialize. Please refresh and try again.', mismatch: 'Passwords do not match',
    genericError: 'An error occurred. Please try again.',
  }

  async function handleGoogleSignUp() {
    setError('')
    setLoading(true)
    if (!supabase) { setError(t.initError); setLoading(false); return }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) { setError(error.message); setLoading(false) }
    } catch {
      setError(t.genericError); setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (!supabase) { setError(t.initError); setLoading(false); return }
    if (formData.password !== formData.confirmPassword) { setError(t.mismatch); setLoading(false); return }
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { first_name: formData.firstName, last_name: formData.lastName } },
      })
      if (error) { setError(error.message); setLoading(false); return }
      router.push(`/login?registered=true&lang=${locale}`)
    } catch {
      setError(t.genericError); setLoading(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent'

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <PublicHeader initialLang={locale} />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.title}</h1>
            <p className="text-gray-600">{t.subtitle}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <button type="button" onClick={handleGoogleSignUp} disabled={loading}
                className="w-full flex items-center justify-center gap-3 rounded-lg border-2 border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t.signupGoogle}
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">{t.or}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.firstName}</label>
                  <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.lastName}</label>
                  <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.email}</label>
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="your@email.com" className={inputCls} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.password}</label>
                <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" className={inputCls} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.confirm}</label>
                <input type="password" required value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="••••••••" className={inputCls} />
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg font-medium text-white transition disabled:opacity-60" style={{ backgroundColor: G }}>
                {loading ? t.creating : t.create}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              {t.haveAccount}{' '}
              <Link href={`/login?lang=${locale}`} className="font-medium hover:underline" style={{ color: G }}>{t.signIn}</Link>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

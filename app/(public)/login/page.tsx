'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import { SupabaseClient } from '@supabase/supabase-js'
import { useLocale } from '@/lib/use-locale'

const G = '#7A9A4A'

export default function ClientLoginPage() {
  return (
    <Suspense>
      <ClientLoginInner />
    </Suspense>
  )
}

function ClientLoginInner() {
  const router = useRouter()
  const locale = useLocale()
  const isAr = locale === 'ar'
  const redirectParam = useSearchParams().get('redirect')
  const destination = redirectParam || `/dashboard?lang=${locale}`
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    setSupabase(createClient())
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verificationSent] = useState(false)

  const t = isAr ? {
    signIn: 'تسجيل الدخول', subtitle: 'الوصول إلى حجوزاتك وحسابك',
    checkEmail: 'تحقق من بريدك الإلكتروني', emailSentTo: 'لقد أرسلنا رمز تحقق إلى',
    checkInbox: 'تحقق من بريدك الوارد وانقر على الرابط لتسجيل الدخول.', backToSignIn: 'العودة لتسجيل الدخول',
    continueGoogle: 'المتابعة باستخدام Google', or: 'أو', email: 'البريد الإلكتروني', password: 'كلمة المرور',
    signingIn: 'جارٍ تسجيل الدخول...', noAccount: 'ليس لديك حساب؟', createOne: 'أنشئ حساباً',
    needHelp: 'تحتاج مساعدة؟', contactUs: 'اتصل بنا', initError: 'فشل التهيئة. حدّث الصفحة وحاول مرة أخرى.',
  } : {
    signIn: 'Sign In', subtitle: 'Access your bookings and account',
    checkEmail: 'Check Your Email', emailSentTo: "We've sent a verification code to",
    checkInbox: 'Check your inbox and click the link to sign in.', backToSignIn: 'Back to sign in',
    continueGoogle: 'Continue with Google', or: 'or', email: 'Email', password: 'Password',
    signingIn: 'Signing in…', noAccount: "Don't have an account?", createOne: 'Create one',
    needHelp: 'Need help?', contactUs: 'Contact us', initError: 'Failed to initialize. Please refresh and try again.',
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (!supabase) { setError(t.initError); setLoading(false); return }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push(destination)
      router.refresh()
    } catch {
      setError(t.initError); setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setLoading(true)
    if (!supabase) { setError(t.initError); setLoading(false); return }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}` },
      })
      if (error) { setError(error.message); setLoading(false) }
    } catch {
      setError(t.initError); setLoading(false)
    }
  }

  return (
    <div dir={isAr ? 'rtl' : 'ltr'}>
      <PublicHeader initialLang={locale} />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.signIn}</h1>
            <p className="text-gray-600">{t.subtitle}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            {verificationSent ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: `${G}20` }}>
                  <span className="text-3xl">✉️</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.checkEmail}</h2>
                <p className="text-sm text-gray-600 mb-6">{t.emailSentTo} {email}. {t.checkInbox}</p>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 rounded-lg border-2 border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {t.continueGoogle}
                </button>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">{t.or}</span></div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.email}</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.password}</label>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent" />
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg font-medium text-white transition disabled:opacity-60" style={{ backgroundColor: G }}>
                  {loading ? t.signingIn : t.signIn}
                </button>
              </form>
            )}

            {!verificationSent && (
              <div className="mt-6 text-center text-sm text-gray-600">
                {t.noAccount}{' '}
                <Link href={`/register?lang=${locale}`} className="font-medium hover:underline" style={{ color: G }}>{t.createOne}</Link>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            {t.needHelp}{' '}
            <Link href={`/contact?lang=${locale}`} className="hover:underline">{t.contactUs}</Link>
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

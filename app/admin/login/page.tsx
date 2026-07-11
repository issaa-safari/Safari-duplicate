'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState(() =>
    searchParams.get('error') === 'unauthorized'
      ? 'Your account was signed in, but this email is not on the admin list. Ask the owner to add it to admin_users.'
      : ''
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : error.message
      )
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen w-full">
      <div
        className="hidden lg:flex lg:w-1/2 relative items-end p-12"
        style={{
          backgroundImage: 'linear-gradient(160deg, #2F3B1F 0%, var(--olive-dk) 45%, var(--olive) 100%)',
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 text-white">
          <p className="text-sm uppercase tracking-widest text-white/70 mb-3">
            Safari Adventure Tour
          </p>
          <h2 className="text-3xl font-semibold leading-tight max-w-md">
            Kenya's Premier Adventure Tours
          </h2>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="h-10 w-10 rounded-lg mb-6 bg-olive hover:bg-olive-dk" />
            <h1 className="text-2xl font-semibold text-foreground">Admin Login</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to manage Safari Adventure Tour
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-login-email" className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input
                id="admin-login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--olive)] focus:border-primary-strong"
                placeholder="you@safariadventuretour.com"
              />
            </div>

            <div>
              <label htmlFor="admin-login-password" className="block text-sm font-medium text-foreground mb-1">Password</label>
              <input
                id="admin-login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)] focus:border-primary-strong"                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-border"
                />
                Remember me
              </label>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Forgot password?
              </a>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={loading}
className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)] focus:border-primary-strong bg-olive hover:bg-olive-dk"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

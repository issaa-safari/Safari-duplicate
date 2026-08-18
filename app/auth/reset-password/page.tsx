import { createClient } from '@/lib/supabase/server'
import ResetPasswordForm from './reset-password-form'
import Link from 'next/link'
import { safeRedirect } from '@/lib/auth/safe-redirect'

// Reached via app/auth/callback, which has already exchanged the recovery
// `?code=` for a session before redirecting here — no second code-exchange
// handler needed (see the note in forgot-password-form.tsx). If there's no
// session by the time this renders, the link was invalid, already used, or
// expired; showing that inline (rather than a hard redirect) avoids racing the
// cookie write from the callback on the same request chain.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const dest = safeRedirect(next)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <h1 className="text-xl font-semibold text-gray-900">This link is invalid or has expired</h1>
          <p className="mt-2 text-sm text-gray-600">
            Password reset links only work once, and go stale after a while. Request a new one.
          </p>
          <Link href="/auth/forgot-password" className="mt-6 block text-sm hover:underline" style={{ color: '#7A9A4A' }}>
            Send a new link
          </Link>
        </div>
      </div>
    )
  }

  return <ResetPasswordForm next={dest} />
}

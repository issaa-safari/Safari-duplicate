import { Suspense } from 'react'
import ForgotPasswordForm from './forgot-password-form'
import { safeRedirect } from '@/lib/auth/safe-redirect'

// Entry point for both the admin and the client-portal login screens — the
// same Supabase Auth identity underlies both, so one reset flow serves either.
// Middleware never gates /auth/* (see proxy.ts's matcher), so this is reachable
// even mid step-up-MFA.
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const dest = safeRedirect(next)

  return (
    <Suspense>
      <ForgotPasswordForm next={dest} />
    </Suspense>
  )
}

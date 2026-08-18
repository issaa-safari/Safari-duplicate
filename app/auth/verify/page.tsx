import { Suspense } from 'react'
import VerifyForm from './verify-form'
import { safeRedirect } from '@/lib/auth/safe-redirect'

// Two-factor step-up interstitial. Middleware redirects here (with ?next=…)
// whenever a session holds only AAL1 but the account has a verified TOTP
// factor. Completing the challenge elevates the session to AAL2, after which
// middleware lets the original destination load.
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const dest = safeRedirect(next)

  return (
    <Suspense>
      <VerifyForm next={dest} />
    </Suspense>
  )
}

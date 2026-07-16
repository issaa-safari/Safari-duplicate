import { Suspense } from 'react'
import VerifyForm from './verify-form'

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
  // Only ever follow a same-origin relative path back; reject protocol-relative
  // (`//host`) and backslash-prefixed targets.
  const dest = next && /^\/(?![/\\])/.test(next) ? next : '/dashboard'

  return (
    <Suspense>
      <VerifyForm next={dest} />
    </Suspense>
  )
}

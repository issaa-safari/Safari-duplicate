// Where to send someone back to after an auth interstitial (2FA step-up,
// password reset) without trusting `?next=` blindly.
//
// Only ever follow a same-origin relative path: a leading slash not followed
// by another slash or a backslash. That rejects protocol-relative targets
// (`//evil.com`, which the browser resolves to an external origin) and
// backslash-prefixed ones some browsers still treat as protocol-relative.

const SAME_ORIGIN_PATH = /^\/(?![/\\])/

export function safeRedirect(next: string | undefined | null, fallback = '/dashboard'): string {
  return next && SAME_ORIGIN_PATH.test(next) ? next : fallback
}

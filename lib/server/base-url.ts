import { headers } from 'next/headers'

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/i

/**
 * The origin this request arrived on, for building links we hand to a client —
 * booking links, quote deliveries, voucher links, request links.
 *
 * Derived from the request rather than an env var so preview deployments and
 * localhost produce links that work in the environment you are standing in.
 * Four copies of this had drifted into four route files; they now share one.
 *
 * The proxy's `x-forwarded-proto` is trusted first because it is the only thing
 * that actually knows — Vercel terminates TLS upstream, so the app never sees
 * the real scheme. The host check is the fallback, and it covers 127.0.0.1 as
 * well as `localhost`: the older copies matched only the latter, so a link
 * generated while browsing 127.0.0.1 came out as https and refused to open.
 */
export async function requestBaseUrl(): Promise<string> {
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'

  const forwarded = h.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const proto = forwarded || (LOOPBACK.test(host) ? 'http' : 'https')

  return `${proto}://${host}`
}

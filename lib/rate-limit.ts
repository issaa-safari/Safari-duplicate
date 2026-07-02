// Lightweight in-memory fixed-window rate limiter for public API routes.
//
// Scope & limits of this approach: state lives in the Node process, so on
// serverless (Vercel) each warm lambda instance counts independently and
// state resets on cold start. That still blunts naive bots and accidental
// retry loops, which is the goal here. If abuse becomes real, swap the
// internals for Upstash Ratelimit behind the same function signature.

import { NextRequest, NextResponse } from 'next/server'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 10_000

function prune(now: number) {
  // Cheap protection against unbounded growth under key-churn attacks.
  if (buckets.size < MAX_BUCKETS) return
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key)
  }
  // Still oversized after removing expired entries? Drop oldest wholesale.
  if (buckets.size >= MAX_BUCKETS) buckets.clear()
}

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
}

/**
 * Returns true when the request is allowed, false when over the limit.
 * `key` should combine a namespace and client identity, e.g. `book:1.2.3.4`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  prune(now)

  const bucket = buckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count++
  return true
}

/**
 * Route-handler helper: returns a ready-made 429 response when the caller
 * is over the limit, or null when the request may proceed.
 */
export function enforceRateLimit(
  req: NextRequest,
  namespace: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  if (rateLimit(`${namespace}:${clientIp(req)}`, limit, windowMs)) return null
  return NextResponse.json(
    { error: 'Too many requests — please try again shortly.' },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) } }
  )
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // Only apply subdomain routing on production domains, not localhost
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1')
  if (isLocalhost) return NextResponse.next()

  // Extract subdomain (everything before the first dot)
  const parts = hostname.replace('www.', '').split('.')
  const subdomain = parts.length > 2 ? parts[0] : ''

  // If admin subdomain, rewrite to /admin paths
  if (subdomain === 'admin') {
    request.nextUrl.pathname = `/admin${pathname}`
    return NextResponse.rewrite(request.nextUrl)
  }

  // All other requests go through normally
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

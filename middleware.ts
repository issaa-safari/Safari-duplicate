import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // Extract subdomain
  const parts = hostname.replace('www.', '').split('.')
  const isLocalhost = hostname.includes('localhost')
  const subdomain = isLocalhost ? '' : parts.length > 2 ? parts[0] : ''

  // Route admin subdomain
  if (subdomain === 'admin') {
    request.nextUrl.pathname = `/admin${pathname}`
    return NextResponse.rewrite(request.nextUrl)
  }

  // Public routes go through normally
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)',
  ],
}

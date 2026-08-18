'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

// GA4 measurement IDs are public (they ship in the page source), so the
// property's ID is the default and the env var only exists to point a fork or
// a staging deployment at a different property — or to switch the tag off
// entirely by setting it to an empty string.
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-47W3RDL9PZ'

// gtag.js checks this flag on every hit, so flipping it is how we keep the
// admin back office out of the public site's property.
const DISABLE_FLAG = `ga-disable-${GA_MEASUREMENT_ID}`

const isBackOffice = (pathname: string | null) => Boolean(pathname?.startsWith('/admin'))

// Google tag (gtag.js). Loaded once from the root layout, so it covers the
// public site, the client portal (/quote/[token]) and the booking flow.
// Page views on client-side navigation are picked up by GA4's enhanced
// measurement (History API events) — sending them by hand here would
// double-count every route change.
export default function GoogleAnalytics() {
  const pathname = usePathname()
  const disabled = isBackOffice(pathname)

  // The inline snippet below sets the flag for the first page load; this keeps
  // it correct in both directions afterwards, since a client-side navigation
  // into /admin never reloads the tag.
  useEffect(() => {
    ;(window as unknown as Record<string, boolean>)[DISABLE_FLAG] = disabled
  }, [disabled])

  // Local development would otherwise report against the live property.
  if (!GA_MEASUREMENT_ID || process.env.NODE_ENV !== 'production') return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window['${DISABLE_FLAG}'] = window.location.pathname.startsWith('/admin');
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  )
}

'use client'

import { useEffect } from 'react'

// Registers the service worker so the app is installable on Android/desktop
// ("Add to Home screen" / "Install app"). Registration is best-effort and
// silent — a failure never affects the page.
export default function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    if (document.readyState === 'complete') onLoad()
    else window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])

  // Recover from the back/forward cache. When an installed (standalone) PWA
  // opens a link — e.g. previewing a client proposal from the delivery panel —
  // and the user navigates back, iOS restores the previous page from bfcache.
  // Next's client router can come back inert in that state: the page renders
  // but <Link> taps (the bottom tab bar, everything) stop navigating. A
  // `pageshow` with `persisted: true` fires *only* on a bfcache restore (not on
  // ordinary app foregrounding), so reloading there re-hydrates a live app
  // without disturbing normal use.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  return null
}

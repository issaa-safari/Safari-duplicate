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
  return null
}

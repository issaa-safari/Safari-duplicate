'use client'

type AnalyticsValue = string | number | boolean | null | undefined
export type AnalyticsParams = Record<string, AnalyticsValue>

declare global { interface Window { gtag?: (...args: unknown[]) => void } }

export function trackEvent(name: string, params: AnalyticsParams = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}

export function pageContext(locale?: string) {
  if (typeof window === 'undefined') return { language: locale ?? 'en' }
  return {
    language: locale ?? (window.location.pathname.startsWith('/ar/') ? 'ar' : 'en'),
    page_path: window.location.pathname,
    page_location: window.location.href,
  }
}

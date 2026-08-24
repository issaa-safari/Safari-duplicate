'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { MouseEvent, ReactNode, useState } from 'react'

export default function AdminNavigationFeedback({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`
  const [pendingFromRoute, setPendingFromRoute] = useState<string | null>(null)
  const pending = pendingFromRoute === routeKey

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    const target = event.target as HTMLElement
    const anchor = target.closest<HTMLAnchorElement>('a[href]')
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return

    const destination = new URL(anchor.href, window.location.href)
    if (destination.origin !== window.location.origin || !destination.pathname.startsWith('/admin')) return
    if (`${destination.pathname}${destination.search}` === `${window.location.pathname}${window.location.search}`) return

    setPendingFromRoute(routeKey)
  }

  return (
    <div onClickCapture={handleClick} aria-busy={pending || undefined}>
      {children}
      {pending && (
        <>
          <div className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary-strong/20" role="progressbar" aria-label="Loading page">
            <div className="h-full w-1/3 animate-pulse bg-primary-strong shadow-[0_0_12px_var(--color-primary-strong)]" />
          </div>
          <div className="fixed inset-0 z-[99] cursor-wait" aria-hidden="true" />
          <span className="sr-only" role="status">Loading page…</span>
        </>
      )}
    </div>
  )
}

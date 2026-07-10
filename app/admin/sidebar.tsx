'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useTransition, useRef } from 'react'
import { Search, MoreHorizontal } from 'lucide-react'
import type { SearchResults, SearchQuote, SearchClient, SearchRequest } from '@/lib/types'

const PRIMARY_NAV = [
  { label: 'Dashboard',    href: '/admin/dashboard' },
  { label: 'Requests',     href: '/admin/requests' },
  { label: 'Quotes',       href: '/admin/quotes' },
  { label: 'Trip Builder', href: '/admin/trip-builder' },
  { label: 'Bookings',     href: '/admin/bookings' },
  { label: 'Clients',      href: '/admin/clients' },
  { label: 'Finance',      href: '/admin/finance' },
]

const OVERFLOW_NAV = [
  { label: 'Tour Templates', href: '/admin/tours' },
  { label: 'Content',        href: '/admin/content' },
  { label: 'Departures',     href: '/admin/departures' },
  { label: 'Suppliers',      href: '/admin/suppliers' },
  { label: 'Analytics',      href: '/admin/analytics' },
]

function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [searching, startSearch] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults(null); return }
    const timer = setTimeout(() => {
      startSearch(async () => {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`)
        if (res.ok) setResults(await res.json())
      })
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  function go(href: string) { onClose(); router.push(href) }

  const hasResults = results && (
    results.quotes?.length || results.clients?.length || results.requests?.length
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: 'rgba(32,39,26,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)' }}>
        <div className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
            placeholder="Search quotes, clients, requests…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && onClose()}
          />
          {searching && <span className="text-xs text-gray-400 animate-pulse">…</span>}
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded border border-gray-200">
            Esc
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query.length < 2 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              Type at least 2 characters to search…
            </div>
          )}

          {query.length >= 2 && !searching && !hasResults && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No results for &ldquo;{query}&rdquo;</div>
          )}

          {(results?.quotes?.length ?? 0) > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide"
                style={{ backgroundColor: 'var(--admin-bg)' }}>Quotes</p>
              {results?.quotes.map((q: SearchQuote) => (
                <button key={q.id} onClick={() => go(`/admin/quotes/${q.id}`)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition"
                  style={{ ['--tw-hover-bg' as string]: 'var(--admin-bg)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--admin-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                  <div>
                    <span className="font-mono text-xs text-gray-400 mr-2">{q.quote_number}</span>
                    <span className="font-medium text-gray-800">{q.client_name ?? q.title ?? 'Quote'}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">{q.status}</span>
                </button>
              ))}
            </div>
          )}

          {(results?.clients?.length ?? 0) > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide"
                style={{ backgroundColor: 'var(--admin-bg)' }}>Clients</p>
              {results?.clients.map((c: SearchClient) => (
                <button key={c.id} onClick={() => go(`/admin/clients/${c.id}`)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--admin-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                  <span className="font-medium text-gray-800">{c.first_name} {c.last_name}</span>
                  <span className="text-xs text-gray-400">{c.email}</span>
                </button>
              ))}
            </div>
          )}

          {(results?.requests?.length ?? 0) > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide"
                style={{ backgroundColor: 'var(--admin-bg)' }}>Requests</p>
              {results?.requests.map((r: SearchRequest) => (
                <button key={r.id} onClick={() => go(`/admin/requests/${r.id}`)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--admin-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                  <div>
                    <span className="font-mono text-xs text-gray-400 mr-2">{r.reference}</span>
                    <span className="font-medium text-gray-800">{r.client_name ?? r.reference}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">
                    {r.stage?.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 text-xs text-gray-400 flex gap-4"
          style={{ borderTop: '1px solid var(--admin-border)', backgroundColor: 'var(--admin-bg)' }}>
          <span>↵ to open</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  )
}

export default function AdminSidebar({
  fullName,
  role,
}: {
  fullName: string
  role: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [searchOpen, setSearchOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }
  const overflowActive = OVERFLOW_NAV.some(item => isActive(item.href))
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase() || 'A'

  return (
    <>
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      <header className="sticky top-0 z-30">
        {/* Utility bar */}
        <div className="h-11 border-b border-border bg-surface">
          <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
            <span className="truncate text-xs text-muted-foreground">
              Alamoudy Group · Safari Adventure Riders
            </span>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="hidden text-xs text-muted-foreground md:block">{fullName}</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-brand-text">
                {role}
              </span>
            </div>
          </div>
        </div>

        {/* Primary nav */}
        <nav className="h-16 border-b border-border bg-surface/95 backdrop-blur">
          <div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 lg:gap-6">
            {/* Brand mark */}
            <Link href="/admin/dashboard" className="flex shrink-0 items-center gap-2.5">
              <span className="font-display flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
                S
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="font-display block text-base font-bold leading-none text-brand-ink">Safari Adventure Tours</span>
                <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Tour Operator Suite
                </span>
              </span>
            </Link>

            {/* Nav links */}
            <div className="flex h-full min-w-0 items-center overflow-x-auto">
              {PRIMARY_NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`relative flex h-full shrink-0 items-center whitespace-nowrap px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    isActive(item.href)
                      ? 'text-brand-ink'
                      : 'text-muted-foreground hover:text-brand-ink'
                  }`}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" />
                  )}
                </Link>
              ))}
            </div>

            {/* Overflow dropdown (outside the scroll container so the menu isn't clipped) */}
            <div ref={moreRef} className="relative -ml-4 h-full shrink-0 lg:-ml-6">
                <button
                  onClick={() => setMoreOpen(v => !v)}
                  aria-label="More modules"
                  aria-expanded={moreOpen}
                  className={`relative flex h-full items-center px-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    overflowActive || moreOpen
                      ? 'text-brand-ink'
                      : 'text-muted-foreground hover:text-brand-ink'
                  }`}
                >
                  <MoreHorizontal size={18} />
                  {overflowActive && (
                    <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" />
                  )}
                </button>
                {moreOpen && (
                  <div className="absolute left-0 top-full z-40 mt-1 w-48 rounded-lg border border-border bg-surface py-1 shadow-lg">
                    {OVERFLOW_NAV.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={`block px-3 py-2 text-sm transition-colors hover:bg-muted ${
                          isActive(item.href)
                            ? 'font-medium text-brand-ink'
                            : 'text-muted-foreground hover:text-brand-ink'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
            </div>

            {/* Search + avatar */}
            <div className="ml-auto flex shrink-0 items-center gap-3">
              <button
                onClick={() => setSearchOpen(true)}
                title="Search (⌘K)"
                className="hidden items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:border-ring/50 sm:flex sm:w-48 lg:w-64"
              >
                <Search size={14} className="shrink-0" />
                <span className="flex-1 truncate">Search requests, clients, lodges…</span>
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                title="Search (⌘K)"
                aria-label="Search"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground sm:hidden"
              >
                <Search size={16} />
              </button>

              <div ref={userRef} className="relative">
                <button
                  onClick={() => setUserOpen(v => !v)}
                  aria-label="Account menu"
                  aria-expanded={userOpen}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {initials}
                </button>
                {userOpen && (
                  <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-lg border border-border bg-surface py-1 shadow-lg">
                    <div className="border-b border-border px-3 py-2">
                      <p className="truncate text-sm font-medium">{fullName}</p>
                      <p className="text-xs capitalize text-muted-foreground">{role}</p>
                    </div>
                    <Link
                      href="/admin/settings"
                      onClick={() => setUserOpen(false)}
                      className="block px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-brand-ink"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>
      </header>
    </>
  )
}

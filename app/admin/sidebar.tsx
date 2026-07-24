'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useTransition, useRef } from 'react'
import {
  Search, MoreHorizontal, LayoutDashboard, Inbox, FileText, Route, CalendarCheck,
  Users, Wallet, Package, Boxes, MapPin, Truck, BarChart3, Clock, Settings, LogOut, X,
  Copy, ArrowLeft, Bike, FileSignature, BedDouble,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SearchResults, SearchQuote, SearchClient, SearchRequest } from '@/lib/types'

type NavItem = { label: string; href: string; icon: LucideIcon }
type NavGroup = { label: string; items: NavItem[] }

const DASHBOARD: NavItem = { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard }

// Single source of truth for every module, organised into functional clusters.
// The desktop "More" dropdown and the mobile "More" sheet are both derived from
// this — filtered so a module never appears twice (once in a bar, once here).
const NAV_GROUPS: NavGroup[] = [
  { label: 'Sales', items: [
    { label: 'Requests',     href: '/admin/requests',     icon: Inbox },
    { label: 'Quotes',       href: '/admin/quotes',       icon: FileText },
    { label: 'Trip Builder', href: '/admin/trip-builder', icon: Route },
    { label: 'Bookings',     href: '/admin/bookings',     icon: CalendarCheck },
  ] },
  { label: 'Operations', items: [
    { label: 'Departures', href: '/admin/departures', icon: MapPin },
    { label: 'Vouchers',   href: '/admin/vouchers',   icon: BedDouble },
    { label: 'Agreements', href: '/admin/agreements', icon: FileSignature },
    { label: 'Motorbikes', href: '/admin/motorbikes', icon: Bike },
  ] },
  { label: 'People', items: [
    { label: 'Clients',   href: '/admin/clients',   icon: Users },
    { label: 'Suppliers', href: '/admin/suppliers', icon: Truck },
  ] },
  { label: 'Catalog', items: [
    { label: 'Content',         href: '/admin/content',        icon: Boxes },
    { label: 'Tour Templates',  href: '/admin/tours',          icon: Package },
    { label: 'Quote Templates', href: '/admin/tour-templates', icon: Copy },
  ] },
  { label: 'Insights', items: [
    { label: 'Finance',   href: '/admin/finance',   icon: Wallet },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Activity',  href: '/admin/activity',  icon: Clock },
  ] },
]

const GROUP_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items)
const byHref = (href: string) => GROUP_ITEMS.find(i => i.href === href)!

// The desktop top bar's primary tabs; everything else lives in the "More"
// dropdown, grouped.
const PRIMARY_NAV: NavItem[] = [
  DASHBOARD,
  byHref('/admin/requests'),
  byHref('/admin/quotes'),
  byHref('/admin/trip-builder'),
  byHref('/admin/bookings'),
  byHref('/admin/clients'),
  byHref('/admin/finance'),
]

// The four destinations promoted to the mobile bottom tab bar; every other
// module lives behind the "More" tab so the bar stays app-clean.
const BOTTOM_NAV: NavItem[] = [
  DASHBOARD,
  byHref('/admin/requests'),
  byHref('/admin/quotes'),
  byHref('/admin/bookings'),
]

const PRIMARY_HREFS = new Set(PRIMARY_NAV.map(n => n.href))
const BOTTOM_HREFS = new Set(BOTTOM_NAV.map(n => n.href))

// Grouped views of the "More" menus, each excluding whatever the adjacent bar
// already shows (empty groups dropped).
const OVERFLOW_GROUPS: NavGroup[] = NAV_GROUPS
  .map(g => ({ label: g.label, items: g.items.filter(i => !PRIMARY_HREFS.has(i.href)) }))
  .filter(g => g.items.length > 0)
const SHEET_GROUPS: NavGroup[] = NAV_GROUPS
  .map(g => ({ label: g.label, items: g.items.filter(i => !BOTTOM_HREFS.has(i.href)) }))
  .filter(g => g.items.length > 0)

const OVERFLOW_ITEMS: NavItem[] = OVERFLOW_GROUPS.flatMap(g => g.items)
const SHEET_ITEMS: NavItem[] = SHEET_GROUPS.flatMap(g => g.items)

// Flat list of every module root, used to decide if the current route is a
// top-level destination (show the brand) or a nested detail/form view (show a
// back button). Ordered longest-href-first so `/admin/content/parks` matches
// before `/admin/content`.
const ALL_NAV: NavItem[] = [DASHBOARD, ...GROUP_ITEMS]

// Resolve the mobile top bar's back affordance for a given path:
// - null  → a top-level module root (or the dashboard); show the brand mark.
// - {…}   → a nested view; show a back button labelled with its parent module.
function resolveBack(pathname: string): { label: string; href: string } | null {
  // Exact match on any module root (or a settings/dashboard root) = top level.
  const roots = [...ALL_NAV.map((n) => n.href), '/admin/settings']
  if (roots.includes(pathname)) return null

  // Otherwise find the deepest module whose root prefixes the path.
  const parent = ALL_NAV
    .filter((n) => pathname.startsWith(n.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]
  if (parent) return { label: parent.label, href: parent.href }
  if (pathname.startsWith('/admin/settings/')) return { label: 'Settings', href: '/admin/settings' }
  return null
}

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
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search quotes, clients, requests…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && onClose()}
          />
          {searching && <span className="text-xs text-muted-foreground animate-pulse">…</span>}
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border">
            Esc
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {query.length < 2 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search…
            </div>
          )}

          {query.length >= 2 && !searching && !hasResults && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</div>
          )}

          {(results?.quotes?.length ?? 0) > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                style={{ backgroundColor: 'var(--admin-bg)' }}>Quotes</p>
              {results?.quotes.map((q: SearchQuote) => (
                <button key={q.id} onClick={() => go(`/admin/quotes/${q.id}`)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition"
                  style={{ ['--tw-hover-bg' as string]: 'var(--admin-bg)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--admin-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                  <div>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{q.quote_number}</span>
                    <span className="font-medium text-foreground">{q.client_name ?? q.title ?? 'Quote'}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{q.status}</span>
                </button>
              ))}
            </div>
          )}

          {(results?.clients?.length ?? 0) > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                style={{ backgroundColor: 'var(--admin-bg)' }}>Clients</p>
              {results?.clients.map((c: SearchClient) => (
                <button key={c.id} onClick={() => go(`/admin/clients/${c.id}`)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--admin-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                  <span className="font-medium text-foreground">{c.first_name} {c.last_name}</span>
                  <span className="text-xs text-muted-foreground">{c.email}</span>
                </button>
              ))}
            </div>
          )}

          {(results?.requests?.length ?? 0) > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                style={{ backgroundColor: 'var(--admin-bg)' }}>Requests</p>
              {results?.requests.map((r: SearchRequest) => (
                <button key={r.id} onClick={() => go(`/admin/requests/${r.id}`)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--admin-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                  <div>
                    <span className="font-mono text-xs text-muted-foreground mr-2">{r.reference}</span>
                    <span className="font-medium text-foreground">{r.client_name ?? r.reference}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                    {r.stage?.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 text-xs text-muted-foreground flex gap-4"
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
  const [sheetOpen, setSheetOpen] = useState(false) // mobile "More" sheet
  const moreRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  // Lock scroll / Escape while the mobile "More" sheet is open. (Every link in
  // the sheet closes it via onClick, so no route-change effect is needed.)
  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [sheetOpen])

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
  const overflowActive = OVERFLOW_ITEMS.some(item => isActive(item.href))
  const moreActive = SHEET_ITEMS.some(item => isActive(item.href))
  const back = resolveBack(pathname)

  function goBack() {
    // Prefer the real back stack (preserves scroll + list state); fall back to
    // the parent module when the app was launched straight onto a deep link
    // (no history to pop — common for an installed PWA / shared link).
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else if (back) router.push(back.href)
  }
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

      {/* ── Desktop chrome (lg+) ───────────────────────────────────────── */}
      <header className="sticky top-0 z-30 hidden lg:block">
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
              <span className="hidden leading-tight xl:block">
                <span className="block text-sm font-semibold text-brand-ink">Safari Adventure Tours</span>
                <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
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
                  <div className="absolute left-0 top-full z-40 mt-1 w-56 rounded-lg border border-border bg-surface py-1.5 shadow-lg">
                    {OVERFLOW_GROUPS.map((group, gi) => (
                      <div key={group.label} className={gi > 0 ? 'mt-1 border-t border-border pt-1' : ''}>
                        <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {group.label}
                        </p>
                        {group.items.map((item) => (
                          <Link
                            key={item.href}
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

      {/* ── Mobile top app bar (below lg) ──────────────────────────────── */}
      {/* pt-safe fills and pads the status-bar / notch inset so the bar isn't
          clipped when installed to the home screen (viewport-fit=cover). */}
      <header data-app-chrome className="sticky top-0 z-30 border-b border-border bg-surface/95 pt-safe backdrop-blur lg:hidden">
        <div className="flex h-14 items-center gap-2 px-3">
          {back ? (
            <button
              onClick={goBack}
              aria-label={`Back to ${back.label}`}
              className="-ml-1 flex h-10 min-h-touch items-center gap-1.5 rounded-lg pl-1 pr-2 text-brand-ink transition-colors active:bg-muted"
            >
              <ArrowLeft size={22} strokeWidth={2.1} className="shrink-0" />
              <span className="truncate text-sm font-semibold">{back.label}</span>
            </button>
          ) : (
            <Link href="/admin/dashboard" className="flex items-center gap-2 min-w-0">
              <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
                S
              </span>
              <span className="truncate text-sm font-semibold text-brand-ink">Safari Adventure Riders</span>
            </Link>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="flex h-10 w-10 min-h-touch items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-colors active:bg-accent"
            >
              <Search size={17} />
            </button>
            <div ref={userRef} className="relative">
              <button
                onClick={() => setUserOpen(v => !v)}
                aria-label="Account menu"
                aria-expanded={userOpen}
                className="flex h-10 w-10 min-h-touch items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-opacity active:opacity-80"
              >
                {initials}
              </button>
              {userOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-lg border border-border bg-surface py-1 shadow-lg">
                  <div className="border-b border-border px-3 py-2">
                    <p className="truncate text-sm font-medium">{fullName}</p>
                    <p className="text-xs capitalize text-muted-foreground">{role}</p>
                  </div>
                  <Link href="/admin/settings" onClick={() => setUserOpen(false)}
                    className="block px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-brand-ink">
                    Settings
                  </Link>
                  <button onClick={handleLogout}
                    className="block w-full px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-destructive">
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile "More" sheet ────────────────────────────────────────── */}
      <div
        data-app-chrome
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-200 ${
          sheetOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        aria-hidden={!sheetOpen}
      >
        <div className="absolute inset-0 bg-bush/50" onClick={() => setSheetOpen(false)} />
        <div
          className={`absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface pb-[calc(env(safe-area-inset-bottom)+5rem)] shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
            sheetOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <div>
              <p className="text-sm font-semibold text-brand-ink">All modules</p>
              <p className="text-xs text-muted-foreground">Alamoudy Group · {role}</p>
            </div>
            <button onClick={() => setSheetOpen(false)} aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
              <X size={18} />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-3 pb-2">
            {SHEET_GROUPS.map((group) => (
              <div key={group.label} className="mb-1">
                <p className="px-1 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {group.label}
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setSheetOpen(false)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors ${
                          active ? 'bg-accent text-brand-ink' : 'text-muted-foreground hover:bg-muted'
                        }`}>
                        <Icon size={20} className={active ? 'text-primary-strong' : ''} />
                        <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 border-t border-border px-3 py-2">
            <Link href="/admin/settings" onClick={() => setSheetOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-brand-ink">
              <Settings size={18} /> Settings
            </Link>
            <button onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-destructive">
              <LogOut size={18} /> Log out
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile bottom tab bar ──────────────────────────────────────── */}
      <nav data-app-chrome className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-touch flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors active:bg-muted/60 ${
                  active ? 'text-primary-strong' : 'text-muted-foreground'
                }`}>
                {active && (
                  <span aria-hidden className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary" />
                )}
                <Icon size={22} strokeWidth={active ? 2.4 : 1.9} className="transition-transform active:scale-90" />
                {item.label}
              </Link>
            )
          })}
          <button
            onClick={() => setSheetOpen(true)}
            aria-label="More modules"
            aria-expanded={sheetOpen}
            className={`relative flex min-h-touch flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors active:bg-muted/60 ${
              moreActive || sheetOpen ? 'text-primary-strong' : 'text-muted-foreground'
            }`}
          >
            {moreActive && (
              <span aria-hidden className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary" />
            )}
            <MoreHorizontal size={22} strokeWidth={moreActive || sheetOpen ? 2.4 : 1.9} className="transition-transform active:scale-90" />
            More
          </button>
        </div>
      </nav>
    </>
  )
}

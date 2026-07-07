'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useTransition, useRef } from 'react'
import {
  LayoutDashboard, Inbox, Map, Library, FileText,
  CalendarDays, BookOpen, Users, DollarSign, BarChart3,
  Search, Leaf, Calculator, Truck, Navigation,
} from 'lucide-react'
import type { SearchResults, SearchQuote, SearchClient, SearchRequest } from '@/lib/types'

const NAV_ITEMS = [
  { label: 'Dashboard',      href: '/admin/dashboard',   Icon: LayoutDashboard },
  { label: 'Requests',       href: '/admin/requests',    Icon: Inbox },
  { label: 'Tour Templates', href: '/admin/tour-templates', Icon: Map },
  { label: 'Content',        href: '/admin/content',     Icon: Library },
  { label: 'Quotes',         href: '/admin/quotes',      Icon: FileText },
  { label: 'Trip Builder',   href: '/admin/trip-builder', Icon: Calculator },
  { label: 'Running Tours',  href: '/admin/running-tours', Icon: Navigation },
  { label: 'Departures',     href: '/admin/departures',  Icon: CalendarDays },
  { label: 'Bookings',       href: '/admin/bookings',    Icon: BookOpen },
  { label: 'Clients',        href: '/admin/clients',     Icon: Users },
  { label: 'Suppliers',      href: '/admin/suppliers',   Icon: Truck },
  { label: 'Finance',        href: '/admin/finance',     Icon: DollarSign },
  { label: 'Analytics',      href: '/admin/analytics',   Icon: BarChart3 },
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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <>
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}

      <header className="sticky top-0 z-30" style={{ boxShadow: '0 2px 8px rgba(32,39,26,0.12)' }}>
        {/* Brand bar */}
        <div style={{ backgroundColor: 'var(--bush)' }}>
          <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-4">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-olive hover:bg-olive-dk">
                <Leaf size={13} color="#fff" />
              </span>
              <span className="text-sm font-bold text-white tracking-wide">Safari Adventure Tours</span>
              <span className="hidden sm:block rounded text-[10px] font-semibold px-2 py-0.5"
                style={{ backgroundColor: 'var(--gold)', color: 'var(--bush)' }}>
                Admin
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="hidden md:block text-xs text-white/60">{fullName}</span>
              <Link href="/admin/settings"
                className="rounded px-2.5 py-1 text-xs text-white/80 hover:text-white transition"
                style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                Settings
              </Link>
              <button onClick={handleLogout}
                className="text-xs text-white/50 hover:text-white/80 transition">
                Log out
              </button>
            </div>
          </div>
        </div>

        {/* Nav strip */}
        <nav style={{ backgroundColor: 'var(--admin-surface)', borderBottom: '2px solid var(--admin-border)' }}>
          <div className="mx-auto flex h-11 max-w-7xl items-center gap-0 overflow-x-auto px-2">

            {/* Search pill */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex shrink-0 items-center gap-2 mr-3 px-3 h-7 rounded-full text-xs transition"
              style={{
                backgroundColor: 'var(--admin-bg)',
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text-muted)',
              }}
              title="Search (⌘K)"
            >
              <Search size={12} />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden lg:inline ml-1 text-[10px] opacity-50">⌘K</kbd>
            </button>

            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={item.label}
                  className="flex h-full shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={isActive
                    ? { borderBottomColor: 'var(--olive)', color: 'var(--olive-dk)', backgroundColor: 'rgba(122,154,74,0.08)' }
                    : { borderBottomColor: 'transparent', color: 'var(--admin-text-muted)' }
                  }
                  onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = 'var(--olive-dk)' } }}
                  onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = 'var(--admin-text-muted)' } }}
                >
                  <item.Icon size={14} className="opacity-70 shrink-0" />
                  <span className="hidden sm:block">{item.label}</span>
                </Link>
              )
            })}

            <span className="ml-auto hidden text-xs lg:block pr-1 capitalize"
              style={{ color: 'var(--admin-text-muted)' }}>
              {role}
            </span>
          </div>
        </nav>
      </header>
    </>
  )
}

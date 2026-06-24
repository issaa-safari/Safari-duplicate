'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useTransition, useRef } from 'react'

const NAV_ITEMS = [
  { label: 'Dashboard',      href: '/admin/dashboard',   icon: '⌂' },
  { label: 'Requests',       href: '/admin/requests',    icon: '▤' },
  { label: 'Tour Templates', href: '/admin/tours',       icon: '◈' },
  { label: 'Content',        href: '/admin/content',     icon: '▧' },
  { label: 'Quotes',         href: '/admin/quotes',      icon: '✦' },
  { label: 'Departures',     href: '/admin/departures',  icon: '◉' },
  { label: 'Clients',        href: '/admin/clients',     icon: '◯' },
  { label: 'Finance',        href: '/admin/finance',     icon: '$' },
  { label: 'Analytics',      href: '/admin/analytics',   icon: '↗' },
]

function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>(null)
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
      style={{ backgroundColor: 'rgba(26,46,19,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--safari-warm)', border: '1px solid var(--safari-border)' }}>
        <div className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--safari-border)' }}>
          <span className="text-gray-400">🔍</span>
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
            <div className="px-4 py-6 text-center text-sm text-gray-400">No results for "{query}"</div>
          )}

          {results?.quotes?.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide"
                style={{ backgroundColor: '#F5F0E8' }}>Quotes</p>
              {results.quotes.map((q: any) => (
                <button key={q.id} onClick={() => go(`/admin/quotes/${q.id}`)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[#F5F0E8] transition text-left">
                  <div>
                    <span className="font-mono text-xs text-gray-400 mr-2">{q.quote_number}</span>
                    <span className="font-medium text-gray-800">{q.client_name ?? q.title ?? 'Quote'}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">{q.status}</span>
                </button>
              ))}
            </div>
          )}

          {results?.clients?.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide"
                style={{ backgroundColor: '#F5F0E8' }}>Clients</p>
              {results.clients.map((c: any) => (
                <button key={c.id} onClick={() => go(`/admin/clients/${c.id}`)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[#F5F0E8] transition text-left">
                  <span className="font-medium text-gray-800">{c.first_name} {c.last_name}</span>
                  <span className="text-xs text-gray-400">{c.email}</span>
                </button>
              ))}
            </div>
          )}

          {results?.requests?.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide"
                style={{ backgroundColor: '#F5F0E8' }}>Requests</p>
              {results.requests.map((r: any) => (
                <button key={r.id} onClick={() => go(`/admin/requests/${r.id}`)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-[#F5F0E8] transition text-left">
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
          style={{ borderTop: '1px solid var(--safari-border)', backgroundColor: '#F5F0E8' }}>
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

      <header className="sticky top-0 z-30" style={{ boxShadow: '0 2px 8px rgba(26,46,19,0.12)' }}>
        {/* Brand bar — deep forest */}
        <div style={{ backgroundColor: 'var(--safari-deep)' }}>
          <div className="mx-auto flex h-10 max-w-7xl items-center justify-between px-4">
            <Link href="/admin/dashboard" className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-sm"
                style={{ backgroundColor: 'var(--safari-brand)', color: '#fff' }}>
                🌿
              </span>
              <span className="text-sm font-bold text-white tracking-wide">SafariOffice</span>
              <span className="hidden sm:block rounded text-[10px] font-semibold px-2 py-0.5"
                style={{ backgroundColor: 'var(--safari-sand)', color: 'var(--safari-deep)' }}>
                Safari Adventure Tour
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

        {/* Nav strip — warm parchment */}
        <nav style={{ backgroundColor: 'var(--safari-warm)', borderBottom: '2px solid var(--safari-border)' }}>
          <div className="mx-auto flex h-11 max-w-7xl items-center gap-0 overflow-x-auto px-2">

            {/* Search pill */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex shrink-0 items-center gap-2 mr-3 px-3 h-7 rounded-full text-xs transition"
              style={{
                backgroundColor: 'var(--safari-parchment)',
                border: '1px solid var(--safari-border)',
                color: '#7A6652',
              }}
              title="Search (⌘K)"
            >
              <span>🔍</span>
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
                  className={`flex h-full shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-[#7A9A4A] text-[#3D5229]'
                      : 'border-transparent text-[#7A6652] hover:text-[#3D5229] hover:border-[#C9A84C]/60'
                  }`}
                  style={isActive ? { backgroundColor: 'rgba(122,154,74,0.09)' } : {}}
                >
                  <span className="text-xs opacity-60">{item.icon}</span>
                  <span className="hidden sm:block">{item.label}</span>
                </Link>
              )
            })}

            <span className="ml-auto hidden text-xs lg:block pr-1 capitalize"
              style={{ color: '#A08060' }}>
              {role}
            </span>
          </div>
        </nav>
      </header>
    </>
  )
}

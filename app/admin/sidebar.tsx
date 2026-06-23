'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { label: 'Requests', href: '/admin/requests', icon: '▤' },
  { label: 'Tour Templates', href: '/admin/tours', icon: '◈' },
  { label: 'Content Library', href: '/admin/content', icon: '▧' },
  { label: 'Quotes', href: '/admin/quotes', icon: '✦' },
  { label: 'Departures', href: '/admin/departures', icon: '□' },
  { label: 'Clients', href: '/admin/clients', icon: '◯' },
  { label: 'Finance', href: '/admin/finance', icon: '$' },
  { label: 'Analytics', href: '/admin/analytics', icon: '↗' },
]

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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="bg-black text-white">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10b916] text-[11px]">↗</span>
            <span>SafariOffice</span>
            <span className="rounded-sm border border-white/30 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
              Safari Adventure Tour
            </span>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <span className="hidden max-w-48 truncate text-white/70 sm:inline">{fullName}</span>
            <Link href="/admin/settings" className="rounded border border-white/15 px-3 py-1.5 hover:bg-white/10">
              Settings
            </Link>
            <button onClick={handleLogout} className="text-white/60 hover:text-white">
              Log out
            </button>
          </div>
        </div>
      </div>

      <nav className="mx-auto flex h-12 max-w-7xl items-center gap-1 overflow-x-auto px-4 text-sm">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex h-full shrink-0 items-center gap-2 border-b-2 px-4 transition ${
                isActive
                  ? 'border-[#7A9A4A] bg-[#7A9A4A]/5 font-semibold text-gray-900'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span className="text-gray-400">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
        <span className="ml-auto hidden text-xs capitalize text-gray-400 lg:block">{role}</span>
      </nav>
    </header>
  )
}

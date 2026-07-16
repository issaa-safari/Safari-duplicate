'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { whatsappLink } from '@/lib/site'

function LangToggle({
  currentLang, hrefFor, onSelect, full = false,
}: {
  currentLang: string
  hrefFor: (l: 'en' | 'ar') => string
  onSelect: () => void
  full?: boolean
}) {
  return (
    <div className={`flex items-center rounded-full bg-white/10 p-0.5 ${full ? 'w-full' : ''}`}>
      {(['en', 'ar'] as const).map((l) => (
        <Link
          key={l}
          href={hrefFor(l)}
          onClick={onSelect}
          className={`rounded-full px-3 py-1 text-center text-xs font-semibold transition-colors ${full ? 'flex-1' : ''} ${
            currentLang === l ? 'bg-olive text-white' : 'text-white/70 hover:text-white'
          }`}
        >
          {l === 'en' ? 'EN' : 'العربية'}
        </Link>
      ))}
    </div>
  )
}

export default function PublicHeader({ initialLang }: { initialLang?: string }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  // Seed from the server-resolved locale so the header can render on the
  // server pass in the right language instead of popping in after hydration.
  const [currentLang, setCurrentLang] = useState(initialLang === 'ar' ? 'ar' : 'en')
  const [signedIn, setSignedIn] = useState(false)
  const ar = currentLang === 'ar'

  // Track auth state so the header shows Dashboard + Sign Out when logged in.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session?.user)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Subtle elevation once the page scrolls under the bar.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Lock body scroll + close on Escape while the mobile sheet is open.
  useEffect(() => {
    if (!mobileMenuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [mobileMenuOpen])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setSignedIn(false)
    setMobileMenuOpen(false)
    router.push(`/?lang=${currentLang}`)
    router.refresh()
  }

  useEffect(() => {
    setMounted(true)
    const urlLang = searchParams.get('lang')

    // 1. Explicit ?lang= in the URL always wins (manual language switch).
    if (urlLang === 'ar' || urlLang === 'en') {
      setCurrentLang(urlLang)
      return
    }

    // 2. The locale cookie is the source of truth for a returning visitor.
    const cookieLang = document.cookie
      .split('; ')
      .find((c) => c.startsWith('locale='))
      ?.split('=')[1]
    if (cookieLang === 'ar' || cookieLang === 'en') {
      setCurrentLang(cookieLang)
      return
    }

    // 3. First visit with no preference yet: auto-detect from browser/timezone.
    let detected: 'en' | 'ar' = navigator.language.split('-')[0] === 'ar' ? 'ar' : 'en'
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
      if (tz.includes('Mecca') || tz.includes('Riyadh') || tz.includes('Jeddah')) detected = 'ar'
    } catch {
      // ignore — keep browser-language detection
    }
    setCurrentLang(detected)
  }, [searchParams])

  // Persist the resolved language so server-rendered pages render in the same
  // language and direction.
  useEffect(() => {
    if (mounted) {
      document.cookie = `locale=${currentLang};path=/;max-age=31536000;samesite=lax`
    }
  }, [currentLang, mounted])

  const getLangUrl = (lang: 'en' | 'ar') => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('lang', lang)
    return `${pathname}?${params.toString()}`
  }

  const getNavLink = (href: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const lang = params.get('lang') || 'en'
    return `${href}?lang=${lang}`
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const nav = [
    { href: '/tours', label: ar ? 'الجولات' : 'Tours' },
    { href: '/departures', label: ar ? 'الرحلات' : 'Departures' },
    { href: '/gallery', label: ar ? 'المعرض' : 'Gallery' },
    { href: '/about', label: ar ? 'نبذة عنا' : 'About' },
    { href: '/contact', label: ar ? 'اتصل بنا' : 'Contact' },
  ]

  const waHref = whatsappLink(
    ar ? 'مرحباً، أود الاستفسار عن رحلات السفاري.' : "Hello! I'd like to ask about your safari tours."
  )
  const display = { fontFamily: 'var(--font-display, "Readex Pro", sans-serif)' }

  return (
    <>
    <header
      className={`sticky top-0 z-50 bg-bush transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_8px_30px_rgba(0,0,0,0.35)]' : ''
      }`}
    >
      {/* subtle top hairline in brand olive for a finished edge */}
      <div aria-hidden className="h-0.5 w-full bg-gradient-to-r from-olive via-gold to-murram opacity-80" />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Logo */}
        <Link
          href={`/?lang=${currentLang}`}
          className="flex min-w-0 items-center gap-2.5"
          onClick={() => setMobileMenuOpen(false)}
        >
          <Image src="/logo-safari-riders.png" alt="Safari Adventure Riders" width={32} height={45} priority className="shrink-0" />
          <span className="truncate text-base font-bold text-white sm:text-lg" style={display}>
            Safari Adventure Riders
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={getNavLink(item.href)}
              className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.href) ? 'text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              {item.label}
              {isActive(item.href) && (
                <span aria-hidden className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-olive" />
              )}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <LangToggle currentLang={currentLang} hrefFor={getLangUrl} onSelect={() => setMobileMenuOpen(false)} />
          {signedIn ? (
            <>
              <Link href={getNavLink('/dashboard')} className="text-sm font-medium text-white/80 hover:text-white">
                {ar ? 'حسابي' : 'Dashboard'}
              </Link>
              <button onClick={handleSignOut} className="text-sm font-medium text-white/80 hover:text-white">
                {ar ? 'خروج' : 'Sign Out'}
              </button>
            </>
          ) : (
            <Link href={getNavLink('/login')} className="text-sm font-medium text-white/80 hover:text-white">
              {ar ? 'دخول' : 'Sign In'}
            </Link>
          )}
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={ar ? 'واتساب' : 'WhatsApp'}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white transition-transform hover:scale-105"
          >
            <svg viewBox="0 0 32 32" className="h-5 w-5 fill-current" aria-hidden>
              <path d="M16 3.2C8.94 3.2 3.2 8.94 3.2 16c0 2.26.6 4.46 1.74 6.4L3.2 28.8l6.57-1.72A12.74 12.74 0 0 0 16 28.68c7.06 0 12.8-5.74 12.8-12.8S23.06 3.2 16 3.2Zm5.83 15.11c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.71.16-.21.32-.82 1.04-1 1.25-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54l-.6-.01c-.21 0-.55.08-.83.4-.29.32-1.09 1.07-1.09 2.61 0 1.54 1.12 3.03 1.28 3.24.16.21 2.2 3.36 5.33 4.71.74.32 1.32.51 1.78.65.75.24 1.43.21 1.97.13.6-.09 1.89-.77 2.16-1.52.27-.74.27-1.38.18-1.52-.08-.13-.29-.21-.61-.37Z" />
            </svg>
          </a>
          <Link
            href={getNavLink('/quote-request')}
            className="rounded-md bg-olive px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-olive-dk"
          >
            {ar ? 'طلب عرض سعر' : 'Request Quote'}
          </Link>
        </div>

        {/* Mobile trigger */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
          aria-label={ar ? 'القائمة' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>

      {/* Mobile full-screen sheet — sibling of <header> so its stacking context
          isn't trapped under the sticky bar; z-[70] clears the floating
          WhatsApp button (z-50). */}
      <div
        className={`fixed inset-0 z-[70] bg-bush transition-opacity duration-300 ease-out motion-reduce:transition-none lg:hidden ${
          mobileMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        dir={ar ? 'rtl' : 'ltr'}
      >
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <span className="text-base font-bold text-white" style={display}>Safari Adventure Riders</span>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={ar ? 'إغلاق' : 'Close menu'}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex h-[calc(100%-4rem)] flex-col overflow-y-auto px-4 pb-8 pt-2 sm:px-6">
          <nav className="flex flex-col">
            {nav.map((item, i) => (
              <Link
                key={item.href}
                href={getNavLink(item.href)}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between border-b border-white/10 py-4 text-2xl font-semibold transition-colors ${
                  isActive(item.href) ? 'text-white' : 'text-white/75 hover:text-white'
                }`}
                style={{ ...display, transitionDelay: mobileMenuOpen ? `${i * 20}ms` : '0ms' }}
              >
                {item.label}
                {isActive(item.href) && <span aria-hidden className="h-2 w-2 rounded-full bg-olive" />}
              </Link>
            ))}
            {signedIn ? (
              <>
                <Link href={getNavLink('/dashboard')} onClick={() => setMobileMenuOpen(false)}
                  className="border-b border-white/10 py-4 text-2xl font-semibold text-white/75 hover:text-white" style={display}>
                  {ar ? 'حسابي' : 'Dashboard'}
                </Link>
                <button onClick={handleSignOut}
                  className="border-b border-white/10 py-4 text-start text-2xl font-semibold text-white/75 hover:text-white" style={display}>
                  {ar ? 'تسجيل الخروج' : 'Sign Out'}
                </button>
              </>
            ) : (
              <Link href={getNavLink('/login')} onClick={() => setMobileMenuOpen(false)}
                className="border-b border-white/10 py-4 text-2xl font-semibold text-white/75 hover:text-white" style={display}>
                {ar ? 'تسجيل الدخول' : 'Sign In'}
              </Link>
            )}
          </nav>

          <div className="mt-auto space-y-3 pt-8">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 py-3.5 text-base font-semibold text-white"
            >
              <svg viewBox="0 0 32 32" className="h-5 w-5 fill-current" aria-hidden>
                <path d="M16 3.2C8.94 3.2 3.2 8.94 3.2 16c0 2.26.6 4.46 1.74 6.4L3.2 28.8l6.57-1.72A12.74 12.74 0 0 0 16 28.68c7.06 0 12.8-5.74 12.8-12.8S23.06 3.2 16 3.2Zm5.83 15.11c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.71.16-.21.32-.82 1.04-1 1.25-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54l-.6-.01c-.21 0-.55.08-.83.4-.29.32-1.09 1.07-1.09 2.61 0 1.54 1.12 3.03 1.28 3.24.16.21 2.2 3.36 5.33 4.71.74.32 1.32.51 1.78.65.75.24 1.43.21 1.97.13.6-.09 1.89-.77 2.16-1.52.27-.74.27-1.38.18-1.52-.08-.13-.29-.21-.61-.37Z" />
              </svg>
              {ar ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}
            </a>
            <Link
              href={getNavLink('/quote-request')}
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg bg-olive px-5 py-3.5 text-center text-base font-semibold text-white"
            >
              {ar ? 'طلب عرض سعر' : 'Request a Quote'}
            </Link>
            <div className="pt-2"><LangToggle currentLang={currentLang} hrefFor={getLangUrl} onSelect={() => setMobileMenuOpen(false)} full /></div>
          </div>
        </div>
      </div>
    </>
  )
}

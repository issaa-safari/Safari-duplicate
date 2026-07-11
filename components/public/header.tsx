'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const G = '#7A9A4A'

export default function PublicHeader({ initialLang }: { initialLang?: string }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  // Seed from the server-resolved locale so the header can render on the
  // server pass in the right language instead of popping in after hydration.
  const [currentLang, setCurrentLang] = useState(initialLang === 'ar' ? 'ar' : 'en')
  const [signedIn, setSignedIn] = useState(false)

  // Track auth state so the header shows Dashboard + Sign Out when logged in.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session?.user)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setSignedIn(false)
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
    //    No redirect — just render in the remembered language to avoid the flash.
    const cookieLang = document.cookie
      .split('; ')
      .find((c) => c.startsWith('locale='))
      ?.split('=')[1]
    if (cookieLang === 'ar' || cookieLang === 'en') {
      setCurrentLang(cookieLang)
      return
    }

    // 3. First visit with no preference yet: auto-detect from browser/timezone
    //    and set state only. We never router.push here, so there is no flash
    //    or redirect loop; the cookie effect below persists the choice.
    let detected: 'en' | 'ar' = navigator.language.split('-')[0] === 'ar' ? 'ar' : 'en'
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
      if (tz.includes('Mecca') || tz.includes('Riyadh') || tz.includes('Jeddah')) detected = 'ar'
    } catch {
      // ignore — keep browser-language detection
    }
    setCurrentLang(detected)
  }, [searchParams])

  // Persist the resolved language so server-rendered pages (about, tours, footer,
  // dashboard…) render in the same language and direction.
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

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E5E0D8]">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href={`/?lang=${currentLang}`} className="flex items-center gap-2.5">
          <Image
            src="/logo-safari-riders.png"
            alt="Safari Adventure Riders logo"
            width={34}
            height={48}
            priority
          />
          <span
            className="font-bold text-lg"
            style={{ fontFamily: 'var(--font-display, "Readex Pro", sans-serif)', color: '#20271A' }}
          >
            Safari Adventure Riders
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href={getNavLink('/tours')} className="text-[#6E6A59] hover:text-[#20271A] text-sm font-medium">
            {currentLang === 'ar' ? 'الجولات' : 'Tours'}
          </Link>
          <Link href={getNavLink('/departures')} className="text-[#6E6A59] hover:text-[#20271A] text-sm font-medium">
            {currentLang === 'ar' ? 'الرحلات' : 'Departures'}
          </Link>
          <Link href={getNavLink('/gallery')} className="text-[#6E6A59] hover:text-[#20271A] text-sm font-medium">
            {currentLang === 'ar' ? 'المعرض' : 'Gallery'}
          </Link>
          <Link href={getNavLink('/about')} className="text-[#6E6A59] hover:text-[#20271A] text-sm font-medium">
            {currentLang === 'ar' ? 'نبذة عنا' : 'About'}
          </Link>
          <Link href={getNavLink('/contact')} className="text-[#6E6A59] hover:text-[#20271A] text-sm font-medium">
            {currentLang === 'ar' ? 'اتصل بنا' : 'Contact'}
          </Link>
          {signedIn ? (
            <>
              <Link href={getNavLink('/dashboard')} className="text-[#6E6A59] hover:text-[#20271A] text-sm font-medium">
                {currentLang === 'ar' ? 'حسابي' : 'Dashboard'}
              </Link>
              <button onClick={handleSignOut} className="text-[#6E6A59] hover:text-[#20271A] text-sm font-medium">
                {currentLang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
              </button>
            </>
          ) : (
            <Link href={getNavLink('/login')} className="text-[#6E6A59] hover:text-[#20271A] text-sm font-medium">
              {currentLang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            </Link>
          )}
          <Link
            href={getNavLink('/quote-request')}
            className="px-5 py-2 rounded-lg font-medium text-white transition"
            style={{ backgroundColor: G }}
          >
            {currentLang === 'ar' ? 'طلب عرض سعر' : 'Request Quote'}
          </Link>

          {/* Language Toggle */}
          <div className="flex gap-2 ml-4 pl-4 border-l border-[#E5E0D8]">
            <Link
              href={getLangUrl('en')}
              className={`text-xs px-3 py-1.5 rounded transition ${
                currentLang === 'en'
                  ? 'bg-[#EAE3D2] text-[#20271A] font-semibold'
                  : 'text-[#6E6A59] hover:text-[#20271A]'
              }`}
            >
              EN
            </Link>
            <Link
              href={getLangUrl('ar')}
              className={`text-xs px-3 py-1.5 rounded transition ${
                currentLang === 'ar'
                  ? 'bg-[#EAE3D2] text-[#20271A] font-semibold'
                  : 'text-[#6E6A59] hover:text-[#20271A]'
              }`}
            >
              العربية
            </Link>
          </div>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5E0D8] px-4 py-4 space-y-3">
          <Link href={getNavLink('/tours')} className="block text-[#6E6A59] hover:text-[#20271A] text-sm font-medium py-2">
            {currentLang === 'ar' ? 'الجولات' : 'Tours'}
          </Link>
          <Link href={getNavLink('/departures')} className="block text-[#6E6A59] hover:text-[#20271A] text-sm font-medium py-2">
            {currentLang === 'ar' ? 'الرحلات' : 'Departures'}
          </Link>
          <Link href={getNavLink('/gallery')} className="block text-[#6E6A59] hover:text-[#20271A] text-sm font-medium py-2">
            {currentLang === 'ar' ? 'المعرض' : 'Gallery'}
          </Link>
          <Link href={getNavLink('/about')} className="block text-[#6E6A59] hover:text-[#20271A] text-sm font-medium py-2">
            {currentLang === 'ar' ? 'نبذة عنا' : 'About'}
          </Link>
          <Link href={getNavLink('/contact')} className="block text-[#6E6A59] hover:text-[#20271A] text-sm font-medium py-2">
            {currentLang === 'ar' ? 'اتصل بنا' : 'Contact'}
          </Link>
          {signedIn ? (
            <>
              <Link href={getNavLink('/dashboard')} className="block text-[#6E6A59] hover:text-[#20271A] text-sm font-medium py-2">
                {currentLang === 'ar' ? 'حسابي' : 'Dashboard'}
              </Link>
              <button onClick={handleSignOut} className="block w-full text-left text-[#6E6A59] hover:text-[#20271A] text-sm font-medium py-2">
                {currentLang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
              </button>
            </>
          ) : (
            <Link href={getNavLink('/login')} className="block text-[#6E6A59] hover:text-[#20271A] text-sm font-medium py-2">
              {currentLang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            </Link>
          )}
          <Link
            href={getNavLink('/quote-request')}
            className="block px-5 py-2 rounded-lg font-medium text-white text-center transition"
            style={{ backgroundColor: G }}
          >
            {currentLang === 'ar' ? 'طلب عرض سعر' : 'Request Quote'}
          </Link>

          {/* Language Toggle Mobile */}
          <div className="flex gap-2 pt-2 border-t border-[#E5E0D8]">
            <Link
              href={getLangUrl('en')}
              className={`flex-1 text-center text-xs px-3 py-2 rounded transition ${
                currentLang === 'en'
                  ? 'bg-[#EAE3D2] text-[#20271A] font-semibold'
                  : 'text-[#6E6A59] hover:text-[#20271A]'
              }`}
            >
              EN
            </Link>
            <Link
              href={getLangUrl('ar')}
              className={`flex-1 text-center text-xs px-3 py-2 rounded transition ${
                currentLang === 'ar'
                  ? 'bg-[#EAE3D2] text-[#20271A] font-semibold'
                  : 'text-[#6E6A59] hover:text-[#20271A]'
              }`}
            >
              العربية
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

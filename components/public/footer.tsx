'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { useLocale } from '@/lib/use-locale'

const G = '#7A9A4A'

export default function PublicFooter() {
  return (
    <Suspense fallback={null}>
      <FooterInner />
    </Suspense>
  )
}

function FooterInner() {
  const locale = useLocale()
  const isAr = locale === 'ar'
  const withLang = (href: string) => `${href}?lang=${locale}`

  const t = isAr ? {
    tagline: 'اختبر البرية. رحلات سفاري بقيادة خبراء عبر أكثر وجهات شرق أفريقيا شهرة.',
    explore: 'استكشف',
    browseTours: 'تصفح الجولات',
    getQuote: 'احصل على عرض سعر',
    ourStory: 'قصتنا',
    company: 'الشركة',
    contactUs: 'اتصل بنا',
    privacy: 'سياسة الخصوصية',
    terms: 'شروط الخدمة',
    getInTouch: 'تواصل معنا',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    whatsapp: 'واتساب',
    rights: 'جميع الحقوق محفوظة.',
  } : {
    tagline: "Experience the wild. Expert-led safaris across East Africa's most iconic destinations.",
    explore: 'Explore',
    browseTours: 'Browse Tours',
    getQuote: 'Get a Quote',
    ourStory: 'Our Story',
    company: 'Company',
    contactUs: 'Contact Us',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    getInTouch: 'Get in Touch',
    email: 'Email',
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    rights: 'All rights reserved.',
  }

  return (
    <footer className="bg-gray-900 text-gray-300 mt-20" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: G }}
              >
                🦁
              </div>
              <span className="font-bold text-white">Safari Adventure Riders</span>
            </div>
            <p className="text-sm text-gray-400">{t.tagline}</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t.explore}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href={withLang('/tours')} className="hover:text-white transition">{t.browseTours}</Link></li>
              <li><Link href={withLang('/quote-request')} className="hover:text-white transition">{t.getQuote}</Link></li>
              <li><Link href={withLang('/about')} className="hover:text-white transition">{t.ourStory}</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t.company}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href={withLang('/contact')} className="hover:text-white transition">{t.contactUs}</Link></li>
              <li><Link href={withLang('/privacy')} className="hover:text-white transition">{t.privacy}</Link></li>
              <li><a href="#" className="hover:text-white transition">{t.terms}</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t.getInTouch}</h3>
            <div className="space-y-2 text-sm">
              <p>
                {t.email}:{' '}
                <a href="mailto:info@safariadventure.com" className="hover:text-white transition">
                  info@safariadventure.com
                </a>
              </p>
              <p>
                {t.phone}:{' '}
                <a href="tel:+254123456789" className="hover:text-white transition">
                  +254 123 456 789
                </a>
              </p>
              <p>
                {t.whatsapp}:{' '}
                <a href="https://wa.me/254123456789" className="hover:text-white transition" target="_blank" rel="noopener noreferrer">
                  +254 123 456 789
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2024 Safari Adventure Riders. {t.rights}</p>
        </div>
      </div>
    </footer>
  )
}

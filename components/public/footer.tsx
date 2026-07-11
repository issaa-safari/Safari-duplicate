'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { useLocale } from '@/lib/use-locale'
import { site, whatsappLink } from '@/lib/site'

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
    gallery: 'معرض الصور',
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
    gallery: 'Gallery',
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
    <footer className="bg-bush text-sand/80 mt-20" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Image
                src="/logo-safari-riders.png"
                alt="Safari Adventure Riders logo"
                width={28}
                height={40}
              />
              <span className="font-bold text-white">Safari Adventure Riders</span>
            </div>
            <p className="text-sm text-sand/60">{t.tagline}</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t.explore}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href={withLang('/tours')} className="hover:text-white transition">{t.browseTours}</Link></li>
              <li><Link href={withLang('/gallery')} className="hover:text-white transition">{t.gallery}</Link></li>
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
              <li><Link href={withLang('/terms')} className="hover:text-white transition">{t.terms}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4">{t.getInTouch}</h3>
            <div className="space-y-2 text-sm">
              <p>
                {t.email}:{' '}
                <a href={`mailto:${site.email}`} className="hover:text-white transition">
                  {site.email}
                </a>
              </p>
              <p>
                {t.phone}:{' '}
                <a href={`tel:${site.phoneE164}`} className="hover:text-white transition">
                  {site.phoneDisplay}
                </a>
              </p>
              <p>
                {t.whatsapp}:{' '}
                <a href={whatsappLink()} className="hover:text-white transition" target="_blank" rel="noopener noreferrer">
                  {site.phoneDisplay}
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-sand/15 pt-8 text-center text-sm text-sand/60">
          <p>&copy; {new Date().getFullYear()} {site.name}. {t.rights}</p>
        </div>
      </div>
    </footer>
  )
}

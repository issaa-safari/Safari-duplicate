'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { site, whatsappLink } from '@/lib/site'
import { localePath } from '@/lib/locale'
import { useLocale } from '@/lib/use-locale'
import { createClient } from '@/lib/supabase/client'
import { isAllowedSocialUrl, type SocialProfile } from '@/lib/social'

export default function PublicFooter() {
  return (
    <Suspense fallback={null}>
      <FooterInner />
    </Suspense>
  )
}

function FooterInner() {
  const locale = useLocale()
  const [profiles, setProfiles] = useState<SocialProfile[]>([])
  const isAr = locale === 'ar'
  const withLang = (href: string) => localePath(href, locale)

  useEffect(() => {
    let active = true
    const supabase = createClient()
    void supabase
      .from('social_profiles')
      .select('id, platform, profile_url, handle, is_enabled, sort_order')
      .eq('is_enabled', true)
      .not('profile_url', 'is', null)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (active) setProfiles((data ?? []) as SocialProfile[])
      })
    return () => { active = false }
  }, [])

  const t = isAr ? {
    tagline: 'اختبر البرية. رحلات سفاري بقيادة خبراء عبر أكثر وجهات شرق أفريقيا شهرة.',
    explore: 'استكشف',
    kenyaSafaris: 'سفاري كينيا',
    maasaiMara: 'سفاري ماساي مارا',
    amboseli: 'سفاري أمبوسيلي',
    familySafaris: 'سفاري للعوائل',
    luxurySafaris: 'السفاري الفاخر',
    motorcycle: 'مغامرات الدراجات',
    kenyaTanzania: 'كينيا وتنزانيا',
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
    followUs: 'تابعنا',
    rights: 'جميع الحقوق محفوظة.',
  } : {
    tagline: "Experience the wild. Expert-led safaris across East Africa's most iconic destinations.",
    explore: 'Explore',
    kenyaSafaris: 'Kenya Safaris',
    maasaiMara: 'Maasai Mara Safari',
    amboseli: 'Amboseli Safari',
    familySafaris: 'Family Safaris',
    luxurySafaris: 'Luxury Safaris',
    motorcycle: 'Motorcycle Adventures',
    kenyaTanzania: 'Kenya + Tanzania',
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
    followUs: 'Follow Us',
    rights: 'All rights reserved.',
  }

  const safariLinks = [
    { href: '/kenya-safari', label: t.kenyaSafaris },
    { href: '/maasai-mara-safari', label: t.maasaiMara },
    { href: '/amboseli-safari', label: t.amboseli },
    { href: '/family-safari-kenya', label: t.familySafaris },
    { href: '/luxury-kenya-safari', label: t.luxurySafaris },
    { href: '/kenya-motorcycle-safari', label: t.motorcycle },
    { href: '/kenya-tanzania-safari', label: t.kenyaTanzania },
  ]

  return (
    <footer className="bg-bush text-sand/80 mt-20" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <Image src="/logo-safari-riders.png" alt="Safari Adventure Riders logo" width={28} height={40} />
              <span className="font-bold text-white">Safari Adventure Riders</span>
            </div>
            <p className="text-sm text-sand/60">{t.tagline}</p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">{t.explore}</h3>
            <ul className="space-y-2 text-sm">
              {safariLinks.map((item) => (
                <li key={item.href}><Link href={withLang(item.href)} className="hover:text-white transition">{item.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">{t.company}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href={withLang('/tours')} className="hover:text-white transition">{t.browseTours}</Link></li>
              <li><Link href={withLang('/gallery')} className="hover:text-white transition">{t.gallery}</Link></li>
              <li><Link href={withLang('/quote-request')} className="hover:text-white transition">{t.getQuote}</Link></li>
              <li><Link href={withLang('/about')} className="hover:text-white transition">{t.ourStory}</Link></li>
              <li><Link href={withLang('/contact')} className="hover:text-white transition">{t.contactUs}</Link></li>
              <li><Link href={withLang('/privacy')} className="hover:text-white transition">{t.privacy}</Link></li>
              <li><Link href={withLang('/terms')} className="hover:text-white transition">{t.terms}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-4">{t.getInTouch}</h3>
            <div className="space-y-2 text-sm">
              <p>{t.email}:{' '}<a href={`mailto:${site.email}`} className="hover:text-white transition">{site.email}</a></p>
              <p>{t.phone}:{' '}<a href={`tel:${site.phoneE164}`} className="hover:text-white transition">{site.phoneDisplay}</a></p>
              <p>{t.whatsapp}:{' '}<a href={whatsappLink()} className="hover:text-white transition" target="_blank" rel="noopener noreferrer">{site.phoneDisplay}</a></p>
            </div>
            {profiles.length > 0 && (
              <div className="mt-5">
                <h4 className="mb-2 text-sm font-semibold text-white">{t.followUs}</h4>
                <div className="flex flex-wrap gap-x-3 gap-y-2 text-sm">
                  {profiles.filter((profile) => profile.profile_url && isAllowedSocialUrl(profile.platform, profile.profile_url)).map((profile) => (
                    <a key={profile.id} href={profile.profile_url!} target="_blank" rel="noopener noreferrer" className="capitalize hover:text-white transition">{profile.platform}</a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-sand/15 pt-8 text-center text-sm text-sand/60">
          <p>&copy; {new Date().getFullYear()} {site.name}. {t.rights}</p>
        </div>
      </div>
    </footer>
  )
}

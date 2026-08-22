import type { Metadata } from 'next'
import { localePath, type Locale } from '@/lib/locale'
import { site } from '@/lib/site'

export function hasArabicContent(record: {
  title_ar?: string | null
  overview_ar?: string | null
}): boolean {
  const filled = (v?: string | null) => typeof v === 'string' && v.trim() !== ''
  return filled(record.title_ar) && filled(record.overview_ar)
}

export function languageAlternates(
  path: string,
  translated = true,
): Record<string, string> {
  const alternates: Record<string, string> = {
    en: localePath(path, 'en'),
    'x-default': localePath(path, 'en'),
  }
  if (translated) alternates.ar = localePath(path, 'ar')
  return alternates
}

export function noindexIfUntranslated(
  locale: Locale,
  translated: boolean,
): Pick<Metadata, 'robots'> {
  return locale === 'ar' && !translated
    ? { robots: { index: false, follow: true } }
    : {}
}

export type LocalisedCopy = { en: string; ar: string }

export const localise = (copy: LocalisedCopy, locale: Locale): string =>
  locale === 'ar' ? copy.ar : copy.en

export function pageMetadata({
  path,
  title,
  description,
  locale,
  absoluteTitle = false,
}: {
  path: string
  title: LocalisedCopy
  description: LocalisedCopy
  locale: Locale
  absoluteTitle?: boolean
}): Metadata {
  const t = localise(title, locale)
  const d = localise(description, locale)
  const self = localePath(path, locale)
  return {
    title: absoluteTitle ? { absolute: t } : t,
    description: d,
    alternates: { canonical: self, languages: languageAlternates(path) },
    openGraph: {
      title: t,
      description: d,
      url: self,
      siteName: site.name,
      locale,
      alternateLocale: locale === 'ar' ? 'en' : 'ar',
    },
    twitter: { title: t, description: d },
  }
}

export function travelAgencyJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    '@id': `${site.url}/#organization`,
    name: site.name,
    url: site.url,
    email: site.email,
    telephone: site.phoneE164,
    image: `${site.url}/opengraph-image.png`,
    logo: `${site.url}/icon.png`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Nairobi',
      addressCountry: 'KE',
    },
    areaServed: [
      { '@type': 'Country', name: 'Kenya' },
      { '@type': 'Country', name: 'Tanzania' },
    ],
    knowsLanguage: ['en', 'ar'],
  }
}

export function faqPageJsonLd(
  items: { question: string; answer: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

export function breadcrumbJsonLd(
  items: { label: string; href: string }[],
  locale: Locale,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `${site.url}${localePath(item.href, locale)}`,
    })),
  }
}

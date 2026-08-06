import type { Metadata } from 'next'
import { localePath, type Locale } from '@/lib/locale'
import { site } from '@/lib/site'

/**
 * hreflang set for a route, so Google serves the Arabic page to Arabic
 * searchers instead of treating the two languages as competing duplicates.
 * x-default points at English, which is what an unmatched locale should get.
 */
export function languageAlternates(path: string): Record<string, string> {
  return {
    en: localePath(path, 'en'),
    ar: localePath(path, 'ar'),
    'x-default': localePath(path, 'en'),
  }
}

// Copy that exists in both site languages. Public pages pick their language
// from ?lang= / the locale cookie rather than from the path, so a page's
// metadata is resolved per request the same way its body is.
export type LocalisedCopy = { en: string; ar: string }

export const localise = (copy: LocalisedCopy, locale: Locale): string =>
  locale === 'ar' ? copy.ar : copy.en

/**
 * Page metadata with a canonical that drops the query string.
 *
 * The canonical is the *localised* path, so the Arabic page is its own indexed
 * URL rather than pointing back at English — paired with the hreflang set so
 * the two are understood as translations, not duplicates. Query strings are
 * excluded so ?type= and campaign parameters never fragment the signals.
 */
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
  /** Skip the root layout's "%s | Safari Adventure Riders" template. */
  absoluteTitle?: boolean
}): Metadata {
  const t = localise(title, locale)
  const d = localise(description, locale)
  const self = localePath(path, locale)
  return {
    title: absoluteTitle ? { absolute: t } : t,
    description: d,
    alternates: { canonical: self, languages: languageAlternates(path) },
    openGraph: { title: t, description: d, url: self, locale },
    twitter: { title: t, description: d },
  }
}

/**
 * Identifies the business itself, as opposed to the TouristTrip blocks on the
 * individual tour pages. Emitted once, from the home page, and referenced by
 * @id so the trip markup can point back at the same entity.
 */
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

/**
 * Rich-result markup for a tour's FAQ block. Google only honours this while the
 * same questions and answers are visible on the page, so callers must pass the
 * list they actually render.
 */
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

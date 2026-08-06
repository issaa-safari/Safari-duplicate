import type { Metadata } from 'next'
import type { Locale } from '@/lib/i18n'
import { site } from '@/lib/site'

// Copy that exists in both site languages. Public pages pick their language
// from ?lang= / the locale cookie rather than from the path, so a page's
// metadata is resolved per request the same way its body is.
export type LocalisedCopy = { en: string; ar: string }

export const localise = (copy: LocalisedCopy, locale: Locale): string =>
  locale === 'ar' ? copy.ar : copy.en

/**
 * Page metadata with a canonical that drops the query string.
 *
 * Both languages currently share one URL, so the canonical points at the clean
 * path — that keeps ?lang=, ?type= and campaign parameters from being indexed
 * as separate near-duplicate pages.
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
  return {
    title: absoluteTitle ? { absolute: t } : t,
    description: d,
    alternates: { canonical: path },
    openGraph: { title: t, description: d, url: path },
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

import type { Metadata } from 'next'
import { localePath, type Locale } from '@/lib/locale'
import { site } from '@/lib/site'

/**
 * Is there enough Arabic on this record to justify an indexed Arabic page?
 *
 * Every public field falls back to English when its Arabic twin is blank, so an
 * untranslated tour still *renders* at /ar/... — it just renders in English.
 * Advertising that as the Arabic translation would be a false hreflang claim:
 * two URLs, one body of text, and an Arabic searcher landing on English prose
 * in an RTL page. Title and overview are the bar; the day-by-day itinerary is
 * not required, since the page is coherent without it.
 */
export function hasArabicContent(record: {
  title_ar?: string | null
  overview_ar?: string | null
}): boolean {
  const filled = (v?: string | null) => typeof v === 'string' && v.trim() !== ''
  return filled(record.title_ar) && filled(record.overview_ar)
}

/**
 * hreflang set for a route, so Google serves the Arabic page to Arabic
 * searchers instead of treating the two languages as competing duplicates.
 * x-default points at English, which is what an unmatched locale should get.
 *
 * Pass `translated: false` for a page with no real Arabic — the ar entry is
 * dropped rather than pointing at an English page wearing lang="ar".
 */
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

/**
 * Keep an untranslated Arabic URL out of the index while leaving it reachable —
 * a visitor who follows the language switcher still gets a working page, but
 * Google is not asked to rank a duplicate of the English one.
 */
export function noindexIfUntranslated(
  locale: Locale,
  translated: boolean,
): Pick<Metadata, 'robots'> {
  return locale === 'ar' && !translated
    ? { robots: { index: false, follow: true } }
    : {}
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

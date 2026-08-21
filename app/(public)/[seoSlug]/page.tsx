import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SeoLandingPage from '@/components/public/seo-landing-page'
import { getServerLocale } from '@/lib/i18n'
import { pageMetadata } from '@/lib/seo'
import { seoLandings } from '@/lib/seo-landings'

export async function generateMetadata({ params, searchParams }: { params: Promise<{ seoSlug: string }>; searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const { seoSlug } = await params
  const landing = seoLandings[seoSlug]
  if (!landing) return {}
  const locale = await getServerLocale(await searchParams)
  return pageMetadata({
    path: `/${seoSlug}`,
    locale,
    absoluteTitle: true,
    title: landing.title,
    description: landing.description,
  })
}

export default async function SeoLandingRoute({ params, searchParams }: { params: Promise<{ seoSlug: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { seoSlug } = await params
  const landing = seoLandings[seoSlug]
  if (!landing) notFound()
  const locale = await getServerLocale(await searchParams)
  return <SeoLandingPage locale={locale} copy={landing.copy[locale]} />
}

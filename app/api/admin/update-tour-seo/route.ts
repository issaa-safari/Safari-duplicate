import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'

const str = (value: unknown) => typeof value === 'string' ? value.trim() || null : null
const arr = (value: unknown) => Array.isArray(value)
  ? value.map((item) => String(item).trim()).filter(Boolean)
  : []

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  try {
    await assertAdminAccess(admin, user.email)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const tourId = typeof body.tour_id === 'string' ? body.tour_id : ''
  const templateId = typeof body.template_id === 'string' ? body.template_id : null
  if (!tourId) return NextResponse.json({ error: 'Tour ID is required.' }, { status: 400 })

  const { error: tourError } = await admin
    .from('tours')
    .update({ template_id: templateId, updated_at: new Date().toISOString() })
    .eq('id', tourId)

  if (tourError) {
    console.error('[update-tour-seo:tour]', tourError)
    return NextResponse.json({ error: 'Failed to update tour template.' }, { status: 500 })
  }

  const seo = body.seo ?? {}
  const seoPayload = {
    tour_id: tourId,
    seo_title_en: str(seo.seo_title_en),
    seo_title_ar: str(seo.seo_title_ar),
    meta_description_en: str(seo.meta_description_en),
    meta_description_ar: str(seo.meta_description_ar),
    primary_keyword_en: str(seo.primary_keyword_en),
    primary_keyword_ar: str(seo.primary_keyword_ar),
    secondary_keywords_en: arr(seo.secondary_keywords_en),
    secondary_keywords_ar: arr(seo.secondary_keywords_ar),
    search_intent: str(seo.search_intent),
    seo_intro_en: str(seo.seo_intro_en),
    seo_intro_ar: str(seo.seo_intro_ar),
    hero_alt_en: str(seo.hero_alt_en),
    hero_alt_ar: str(seo.hero_alt_ar),
    og_title_en: str(seo.og_title_en),
    og_title_ar: str(seo.og_title_ar),
    og_description_en: str(seo.og_description_en),
    og_description_ar: str(seo.og_description_ar),
    updated_at: new Date().toISOString(),
  }

  const { error: seoError } = await admin
    .from('tour_seo')
    .upsert(seoPayload, { onConflict: 'tour_id' })

  if (seoError) {
    console.error('[update-tour-seo:seo]', seoError)
    return NextResponse.json({ error: 'Failed to save SEO settings.' }, { status: 500 })
  }

  if (Array.isArray(body.sections)) {
    const sections = body.sections
      .filter((section: any) => section && typeof section.section_key === 'string')
      .map((section: any, index: number) => ({
        tour_id: tourId,
        section_key: section.section_key,
        title_en: str(section.title_en),
        title_ar: str(section.title_ar),
        content_en: str(section.content_en),
        content_ar: str(section.content_ar),
        sort_order: Number.isInteger(section.sort_order) ? section.sort_order : index,
        is_enabled: section.is_enabled !== false,
        updated_at: new Date().toISOString(),
      }))

    if (sections.length > 0) {
      const { error: sectionError } = await admin
        .from('tour_content_sections')
        .upsert(sections, { onConflict: 'tour_id,section_key' })

      if (sectionError) {
        console.error('[update-tour-seo:sections]', sectionError)
        return NextResponse.json({ error: 'Failed to save template content.' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ success: true })
}

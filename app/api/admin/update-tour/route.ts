import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { assertAdminAccess } from '@/lib/auth/admin-access'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const id = typeof body.id === 'string' ? body.id : ''
  const titleEn = typeof body.title_en === 'string' ? body.title_en.trim() : ''
  const status = typeof body.status === 'string' ? body.status : ''
  const maxGroupSize = Number(body.max_group_size)
  const depositPercent = Number(body.deposit_percent)
  const difficultyRating = Number(body.difficulty_rating)
  const comfortRating = Number(body.comfort_rating)
  const basePrice = body.base_price_usd === null || body.base_price_usd === ''
    ? null
    : Number(body.base_price_usd)

  if (!id || !titleEn) return NextResponse.json({ error: 'Tour ID and title are required.' }, { status: 400 })
  if (!['draft', 'active', 'archived'].includes(status)) {
    return NextResponse.json({ error: 'Invalid tour status.' }, { status: 400 })
  }
  if (!Number.isInteger(maxGroupSize) || maxGroupSize < 1) {
    return NextResponse.json({ error: 'Max group size must be a positive integer.' }, { status: 400 })
  }
  if (!Number.isFinite(depositPercent) || depositPercent < 0 || depositPercent > 100) {
    return NextResponse.json({ error: 'Deposit percentage must be between 0 and 100.' }, { status: 400 })
  }
  if (![difficultyRating, comfortRating].every(value => Number.isInteger(value) && value >= 1 && value <= 10)) {
    return NextResponse.json({ error: 'Ratings must be between 1 and 10.' }, { status: 400 })
  }
  if (basePrice !== null && (!Number.isFinite(basePrice) || basePrice < 0)) {
    return NextResponse.json({ error: 'Base price is invalid.' }, { status: 400 })
  }

  const str = (v: any) => (typeof v === 'string' ? v.trim() || null : null)
  const arr = (v: any) => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [])
  const totalDistance = body.total_distance_km === null || body.total_distance_km === ''
    ? null
    : Number(body.total_distance_km)

  const updates = {
    title_en: titleEn,
    title_ar: str(body.title_ar),
    subtitle_en: str(body.subtitle_en),
    subtitle_ar: str(body.subtitle_ar),
    overview_en: str(body.overview_en),
    overview_ar: str(body.overview_ar),
    countries_visited: str(body.countries_visited),
    start_destination: str(body.start_destination),
    end_destination: str(body.end_destination),
    status,
    featured: body.featured === true,
    show_on_website: body.show_on_website === true,
    max_group_size: maxGroupSize,
    base_price_usd: basePrice,
    deposit_percent: depositPercent,
    difficulty_rating: difficultyRating,
    comfort_rating: comfortRating,
    // Rich content (group_23)
    terrain: str(body.terrain),
    vehicle: str(body.vehicle),
    accommodation_level: str(body.accommodation_level),
    total_distance_km: totalDistance !== null && Number.isFinite(totalDistance) ? totalDistance : null,
    hero_image_url: str(body.hero_image_url),
    route_map_url: str(body.route_map_url),
    gallery_urls: arr(body.gallery_urls),
    highlights_en: arr(body.highlights_en),
    highlights_ar: arr(body.highlights_ar),
    included_en: arr(body.included_en),
    included_ar: arr(body.included_ar),
    excluded_en: arr(body.excluded_en),
    excluded_ar: arr(body.excluded_ar),
    faqs: Array.isArray(body.faqs) ? body.faqs : [],
  }

  const admin = createAdminClient()
  try {
    await assertAdminAccess(admin, user.email)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { error } = await admin
    .from('tours')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[update-tour]', error)
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

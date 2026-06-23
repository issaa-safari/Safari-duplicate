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

  const updates = {
    title_en: titleEn,
    title_ar: typeof body.title_ar === 'string' ? body.title_ar.trim() || null : null,
    subtitle_en: typeof body.subtitle_en === 'string' ? body.subtitle_en.trim() || null : null,
    overview_en: typeof body.overview_en === 'string' ? body.overview_en.trim() || null : null,
    status,
    featured: body.featured === true,
    show_on_website: body.show_on_website === true,
    max_group_size: maxGroupSize,
    base_price_usd: basePrice,
    deposit_percent: depositPercent,
    difficulty_rating: difficultyRating,
    comfort_rating: comfortRating,
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

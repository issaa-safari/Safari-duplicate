import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Public list of published, upcoming departures for the homepage / listings.
export async function GET() {
  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await admin
    .from('departures')
    .select(`
      id, start_date, end_date, max_seats, booked_seats, price_usd, status,
      tours ( title_en, title_ar, type, hero_image_url, gallery_urls )
    `)
    .eq('is_active', true)
    .gte('end_date', today)
    .order('start_date', { ascending: true })
    .limit(6)

  if (error) {
    return NextResponse.json({ departures: [] }, { status: 200 })
  }

  return NextResponse.json({ departures: data ?? [] })
}

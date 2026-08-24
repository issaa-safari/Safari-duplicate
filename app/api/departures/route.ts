import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Public list of upcoming departures for the homepage / listings.
// Uses the anon client + RLS (group_30) — never the service role.
export async function GET() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('departures')
    .select(`
      id, start_date, end_date, max_seats, booked_seats, price_usd, price_single_usd, status,
      tours!inner ( title_en, title_ar, type, hero_image_url, gallery_urls )
    `)
    .eq('is_active', true)
    .eq('is_public', true)
    .eq('tours.status', 'active')
    .eq('tours.show_on_website', true)
    .gte('end_date', today)
    .order('start_date', { ascending: true })
    .limit(6)

  if (error) {
    return NextResponse.json({ departures: [] }, { status: 200 })
  }

  return NextResponse.json(
    { departures: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  )
}

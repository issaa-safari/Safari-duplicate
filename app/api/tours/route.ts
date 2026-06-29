import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Public list of active tours for the quote-request dropdown and listings.
export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tours')
    .select('id, title_en, title_ar, type, duration_days')
    .eq('status', 'active')
    .order('title_en')

  if (error) return NextResponse.json({ tours: [] }, { status: 200 })
  return NextResponse.json({ tours: data ?? [] })
}

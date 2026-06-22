import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { kind, name, destinationId } = await request.json()
  const cleanName = (name || '').trim()
  if (!cleanName) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const admin = createAdminClient()

  if (kind === 'destination') {
    const { data, error } = await admin
      .from('destinations')
      .insert({ name: cleanName })
      .select('id, name')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
  }

  if (kind === 'accommodation') {
    const { data, error } = await admin
      .from('accommodations')
      .insert({ name: cleanName, destination_id: destinationId || null })
      .select('id, name, destination_id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
  }

  if (kind === 'activity') {
    const { data, error } = await admin
      .from('activities')
      .insert({ name: cleanName, destination_id: destinationId || null })
      .select('id, name, destination_id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item: data })
  }

  return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
}
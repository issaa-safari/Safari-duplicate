import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import RateCardEditor from './form'

export default async function RateCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const [{ data: card }, { data: rates }, { data: ageBands }, { data: accommodations }, { data: activities }, { data: vehicles }, { data: staff }, { data: destinations }, { data: parks }, { data: suppliers }] = await Promise.all([
    admin.from('supplier_rate_cards').select('*').eq('id', id).single(),
    admin.from('supplier_rates').select('*').eq('rate_card_id', id).order('sort_order'),
    admin.from('traveller_age_bands').select('code, name').eq('is_active', true).order('sort_order'),
    admin.from('accommodations').select('id, name').eq('is_active', true).order('name'),
    admin.from('activities').select('id, name').eq('is_active', true).order('name'),
    admin.from('vehicles').select('id, name').eq('is_active', true).order('name'),
    admin.from('tour_staff').select('id, name').eq('is_active', true).order('name'),
    admin.from('destinations').select('id, name').eq('is_active', true).order('name'),
    admin.from('parks').select('id, name').eq('is_active', true).order('name'),
    admin.from('suppliers').select('id, name').eq('is_active', true).order('name'),
  ])
  if (!card) notFound()

  return <RateCardEditor card={card} rates={rates ?? []} ageBands={ageBands ?? []} suppliers={suppliers ?? []} entities={{ accommodation: accommodations ?? [], activity: activities ?? [], vehicle: vehicles ?? [], staff: staff ?? [], destination: destinations ?? [], park_fee: parks ?? [] }} />
}

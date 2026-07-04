import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import NewRateCardForm from './form'

export default async function NewRateCardPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; entityId?: string; supplierId?: string }>
}) {
  const { entityType, entityId, supplierId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const [{ data: accommodations }, { data: activities }, { data: vehicles }, { data: staff }, { data: destinations }, { data: parks }, { data: suppliers }] = await Promise.all([
    admin.from('accommodations').select('id, name').eq('is_active', true).order('name'),
    admin.from('activities').select('id, name').eq('is_active', true).order('name'),
    admin.from('vehicles').select('id, name').eq('is_active', true).order('name'),
    admin.from('tour_staff').select('id, name').eq('is_active', true).order('name'),
    admin.from('destinations').select('id, name').eq('is_active', true).order('name'),
    admin.from('parks').select('id, name').eq('is_active', true).order('name'),
    admin.from('suppliers').select('id, name').eq('is_active', true).order('name'),
  ])

  return (
    <NewRateCardForm
      suppliers={suppliers ?? []}
      entities={{ accommodation: accommodations ?? [], activity: activities ?? [], vehicle: vehicles ?? [], staff: staff ?? [], destination: destinations ?? [], park_fee: parks ?? [] }}
      defaults={{ entityType, entityId, supplierId }}
    />
  )
}

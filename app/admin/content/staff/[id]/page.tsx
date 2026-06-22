import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import StaffEditForm from './form'

export default async function StaffEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('tour_staff')
    .select('id, name, role, phone, email, notes, is_active')
    .eq('id', id)
    .single()

  if (!member) notFound()

  return <StaffEditForm member={member} />
}

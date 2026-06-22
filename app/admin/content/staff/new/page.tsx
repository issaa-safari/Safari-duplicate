import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewStaffForm from './form'

export default async function NewStaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return <NewStaffForm />
}

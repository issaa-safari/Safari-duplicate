import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewVehicleForm from './form'

export default async function NewVehiclePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return <NewVehicleForm />
}

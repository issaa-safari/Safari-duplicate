import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewDestinationForm from './form'

export default async function NewDestinationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  return <NewDestinationForm />
}

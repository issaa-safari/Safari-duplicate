import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import NewRequestWizard from './wizard'

export default async function NewRequestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: templateData } = await admin
    .from('quotes')
    .select('id, quote_number, quote_versions (title, version_number)')
    .eq('is_template', true)
    .order('created_at', { ascending: false })

  const templates = (templateData ?? []).map((t: any) => {
    const latest = (t.quote_versions ?? []).sort((a: any, b: any) => b.version_number - a.version_number)[0]
    return { id: t.id, label: `${latest?.title || 'Untitled'} · ${t.quote_number}` }
  })

  return <NewRequestWizard templates={templates} />
}

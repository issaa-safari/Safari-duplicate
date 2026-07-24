import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AgreementEditor from './editor-client'
import type { AgreementTemplate } from '@/lib/types'

export default async function AgreementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: template } = await admin
    .from('agreement_templates')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Signed / pending counts for a small at-a-glance summary.
  const [{ count: signed }, { count: pending }] = await Promise.all([
    admin.from('traveller_agreements').select('id', { count: 'exact', head: true }).eq('status', 'signed'),
    admin.from('traveller_agreements').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Traveller Agreement</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          The policy &amp; waiver document travellers sign. Issue and track signatures from each
          departure&rsquo;s Group Manifest.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {signed ?? 0} signed · {pending ?? 0} awaiting signature
        </p>
      </div>
      <AgreementEditor template={(template as AgreementTemplate) ?? null} />
    </div>
  )
}

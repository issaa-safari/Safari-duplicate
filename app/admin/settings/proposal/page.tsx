import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProposalTemplateEditor from './editor-client'
import type { ProposalTemplate } from '@/lib/types'

export default async function ProposalTemplatePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: template } = await admin
    .from('proposal_templates')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <Link href="/admin/settings" className="text-sm text-muted-foreground hover:underline">
          ← Back to settings
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Proposal Template</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          The editable cover letter shown on your client-facing proposal and the email that carries the
          proposal link. Bilingual (English / Arabic).
        </p>
      </div>
      <ProposalTemplateEditor template={(template as ProposalTemplate) ?? null} />
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RequestForm, { type ClientOption } from '../request-form'

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { client: preselectedClientId } = await searchParams

  // clients is RLS-locked to service_role (group_34), so read via admin.
  const admin = createAdminClient()
  const { data: clientRows } = await admin
    .from('clients')
    .select('id, first_name, last_name, email')
    .order('first_name')

  const clients: ClientOption[] = (clientRows ?? []).map((c: { id: string; first_name: string | null; last_name: string | null; email: string | null }) => ({
    id: c.id,
    name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.email || 'Unnamed client',
    email: c.email,
  }))

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/requests" className="text-sm text-muted-foreground hover:text-foreground">
          Back to Requests
        </Link>
        <h1 className="text-xl font-semibold text-foreground">New Request</h1>
      </div>
      <RequestForm clients={clients} initialClientId={preselectedClientId ?? null} />
    </div>
  )
}

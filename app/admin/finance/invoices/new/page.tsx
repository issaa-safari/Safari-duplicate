import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import NewInvoiceForm, { type ClientOption } from './new-invoice-form'

export default async function NewFreehandInvoicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: clients } = await admin
    .from('clients')
    .select('id, first_name, last_name, email')
    .order('first_name', { ascending: true })
    .limit(500)

  const clientOptions: ClientOption[] = (clients ?? []).map((c) => ({
    id: c.id as string,
    name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || (c.email as string | null) || 'Unnamed client',
    email: (c.email as string | null) ?? null,
  }))

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">New invoice</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          A one-off invoice with no quote or booking behind it — address it to an existing
          client, create one, or just type who it&rsquo;s for.
        </p>
      </div>
      <NewInvoiceForm clients={clientOptions} />
    </div>
  )
}

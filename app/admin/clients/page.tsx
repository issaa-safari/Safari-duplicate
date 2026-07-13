import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { ButtonLink, Button } from '@/components/ui/button'
import { PageShell, PageHeader } from '@/components/admin/ui/page'
import { StatCard } from '@/components/admin/ui/card'
import { EmptyState } from '@/components/admin/ui/empty-state'
import { Table, THead, Th, Tr, Td } from '@/components/admin/ui/table'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; filter?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const params = await searchParams
  const search = params.search ?? ''
  const filter = params.filter ?? 'all'

  let query = supabase.from('clients').select('*').order('created_at', { ascending: false })
  if (search) query = query.or("first_name.ilike.%" + search + "%,last_name.ilike.%" + search + "%,email.ilike.%" + search + "%")
  if (filter === 'arabic') query = query.eq('language', 'ar')

  const { data: clients } = await query

  const totalClients = clients?.length ?? 0
  const arabicClients = clients?.filter((c: any) => c.language === 'ar').length ?? 0
  const repeatBookers = clients?.filter((c: any) => c.total_bookings >= 2).length ?? 0

  return (
    <PageShell>
      <PageHeader
        title="Clients"
        subtitle="Everyone who has enquired or travelled with you"
        actions={
          <ButtonLink href="/admin/requests/new" variant="primary" size="sm">
            + New Request
          </ButtonLink>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Total Clients" value={String(totalClients)} />
        <StatCard label="Arabic Speaking" value={String(arabicClients)} />
        <StatCard label="Repeat Bookers" value={String(repeatBookers)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <form method="GET" className="flex min-w-0 flex-1 gap-2">
          <input
            type="search"
            name="search"
            defaultValue={search}
            aria-label="Search clients"
            placeholder="Search by name or email…"
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors duration-150 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          <Button type="submit" variant="secondary" size="sm">Search</Button>
        </form>
        <div className="flex gap-1.5" role="group" aria-label="Filter clients">
          {[{ key: 'all', label: 'All' }, { key: 'arabic', label: 'Arabic' }].map(f => (
            <Link
              key={f.key}
              href={"/admin/clients?filter=" + f.key}
              aria-current={filter === f.key ? 'page' : undefined}
              className={"rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-150 " +
                (filter === f.key
                  ? 'border-transparent bg-accent text-accent-foreground'
                  : 'border-border bg-surface text-muted-foreground hover:bg-muted')}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        {!clients || clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? `No clients match “${search}”` : 'No clients yet'}
            body={search
              ? 'Try a different name or email, or clear the search.'
              : 'Clients are created automatically when you add a request, or from the WhatsApp lead capture.'}
            action={
              !search && (
                <ButtonLink href="/admin/requests/new" variant="primary" size="sm">
                  + New Request
                </ButtonLink>
              )
            }
          />
        ) : (
          <Table>
            <THead>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th className="hidden md:table-cell">Country</Th>
              <Th className="hidden md:table-cell">Language</Th>
              <Th className="hidden lg:table-cell">Bookings</Th>
              <Th>Added</Th>
              <Th><span className="sr-only">Actions</span></Th>
            </THead>
            <tbody>
              {clients.map((client: any) => (
                <Tr key={client.id}>
                  <Td data-label="Name">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                        {(client.first_name?.[0] ?? '?').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link href={"/admin/clients/" + client.id} className="font-medium text-foreground hover:underline">
                          {client.first_name} {client.last_name}
                        </Link>
                        {client.total_bookings >= 2 && (
                          <p className="text-xs text-brand-text">Repeat booker</p>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td data-label="Email" className="text-muted-foreground">{client.email}</Td>
                  <Td data-label="Country" className="hidden text-muted-foreground md:table-cell">{client.country ?? '—'}</Td>
                  <Td data-label="Language" className="hidden md:table-cell">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {client.language === 'ar' ? 'Arabic' : 'English'}
                    </span>
                  </Td>
                  <Td data-label="Bookings" className="hidden tabular-nums text-muted-foreground lg:table-cell">{client.total_bookings ?? 0}</Td>
                  <Td data-label="Added" className="text-xs text-muted-foreground">{new Date(client.created_at).toLocaleDateString('en-GB')}</Td>
                  <Td>
                    <ButtonLink href={"/admin/clients/" + client.id} variant="ghost" size="sm">
                      View
                    </ButtonLink>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </PageShell>
  )
}

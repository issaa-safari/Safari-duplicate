import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ButtonLink, Button } from '@/components/ui/button'

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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-foreground">Clients</h1>
        <ButtonLink href="/admin/requests/new" size="sm">+ New Request</ButtonLink>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-surface shadow-sm p-4 text-center">
          <p className="text-2xl font-semibold text-foreground">{totalClients}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Clients</p>
        </div>
        <div className="rounded-xl border border-border bg-surface shadow-sm p-4 text-center">
          <p className="text-2xl font-semibold text-foreground">{arabicClients}</p>
          <p className="text-xs text-muted-foreground mt-1">Arabic Speaking</p>
        </div>
        <div className="rounded-xl border border-border bg-surface shadow-sm p-4 text-center">
          <p className="text-2xl font-semibold text-foreground">{repeatBookers}</p>
          <p className="text-xs text-muted-foreground mt-1">Repeat Bookers</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <form method="GET" className="flex gap-2 flex-1">
          <input type="text" name="search" defaultValue={search}
            placeholder="Search by name or email..."
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)]" />
          <Button type="submit" size="sm">Search</Button>
        </form>
        <div className="flex gap-2">
          {[{ key: 'all', label: 'All' }, { key: 'arabic', label: 'Arabic' }].map(f => (
            <Link key={f.key} href={"/admin/clients?filter=" + f.key}
              className={"rounded-md px-3 py-2 text-sm font-medium border transition " +
                (filter === f.key ? 'text-white border-transparent' : 'bg-surface text-muted-foreground border-border')}
              style={filter === f.key ? { backgroundColor: 'var(--olive)' } : {}}>
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {!clients || clients.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">No clients yet. They appear here when you add requests.</p>
          </div>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-surface-alt">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Country</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Language</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Bookings</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Added</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client: any, i: number) => (
                <tr key={client.id}
                  className={"border-b border-gray-50 hover:bg-muted transition " + (i === clients.length - 1 ? 'border-0' : '')}>
                  <td data-label="Name" className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium text-[var(--olive-dk)]">
                        {(client.first_name?.[0] ?? '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{client.first_name} {client.last_name}</p>
                        {client.total_bookings >= 2 && <span className="text-xs text-brand-text">Repeat booker</span>}
                      </div>
                    </div>
                  </td>
                  <td data-label="Email" className="px-4 py-3 text-muted-foreground">{client.email}</td>
                  <td data-label="Country" className="px-4 py-3 text-muted-foreground hidden md:table-cell">{client.country ?? '—'}</td>
                  <td data-label="Language" className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {client.language === 'ar' ? 'Arabic' : 'English'}
                    </span>
                  </td>
                  <td data-label="Bookings" className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{client.total_bookings ?? 0}</td>
                  <td data-label="Added" className="px-4 py-3 text-muted-foreground text-xs">{new Date(client.created_at).toLocaleDateString('en-GB')}</td>
                 <td className="px-4 py-3">
  <Link
    href={"/admin/clients/" + client.id}
    className="text-xs font-medium text-white rounded-md px-3 py-1.5 bg-olive hover:bg-olive-dk">
    View
  </Link>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
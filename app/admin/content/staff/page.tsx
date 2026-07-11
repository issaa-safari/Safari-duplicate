import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ButtonLink, Button } from '@/components/ui/button'
import ContentShell from '../content-shell'

const ROLE_STYLES: Record<string, string> = {
  guide: 'bg-green-100 text-green-700',
  driver: 'bg-blue-100 text-blue-700',
  chef: 'bg-amber-100 text-warning-foreground',
  coordinator: 'bg-purple-100 text-purple-700',
}

export default async function TourStaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: staff } = await admin
    .from('tour_staff')
    .select('id, name, role, phone, email, is_active')
    .order('name', { ascending: true })

  return (
    <ContentShell active="staff" title="Tour Staff" icon="♙">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Tour Staff</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Guides, drivers, chefs, and coordinators</p>
        </div>
        <ButtonLink href="/admin/content/staff/new" size="sm">+ New Staff Member</ButtonLink>
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {!staff || staff.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">No staff members added yet.</p>
            <Link href="/admin/content/staff/new" className="text-sm font-medium text-brand-text hover:underline">
              Add your first staff member
            </Link>
          </div>
        ) : (
          <table className="stack-table w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Phone</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s: any) => (
                <tr key={s.id} className="border-b border-border/70 last:border-0 hover:bg-muted">
                  <td data-label="Name" className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td data-label="Role" className="px-4 py-3">
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium capitalize ' +
                      (ROLE_STYLES[s.role] ?? 'bg-muted text-muted-foreground')}>
                      {s.role}
                    </span>
                  </td>
                  <td data-label="Phone" className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.phone ?? '—'}</td>
                  <td data-label="Email" className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.email ?? '—'}</td>
                  <td data-label="Status" className="px-4 py-3">
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' +
                      (s.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground')}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ButtonLink
                      href={'/admin/content/staff/' + s.id} size="sm">Edit
                    </ButtonLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ContentShell>
  )
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ContentShell from '../content-shell'

const ROLE_STYLES: Record<string, string> = {
  guide: 'bg-green-100 text-green-700',
  driver: 'bg-blue-100 text-blue-700',
  chef: 'bg-amber-100 text-amber-700',
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
          <h1 className="text-lg font-semibold text-gray-900">Tour Staff</h1>
          <p className="text-sm text-gray-500 mt-0.5">Guides, drivers, chefs, and coordinators</p>
        </div>
        <Link
          href="/admin/content/staff/new"
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: '#7A9A4A' }}>
          + New Staff Member
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {!staff || staff.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500 mb-4">No staff members added yet.</p>
            <Link href="/admin/content/staff/new" className="text-sm font-medium text-[#7A9A4A] hover:underline">
              Add your first staff member
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
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
                <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3">
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium capitalize ' +
                      (ROLE_STYLES[s.role] ?? 'bg-gray-100 text-gray-600')}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{s.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{s.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' +
                      (s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={'/admin/content/staff/' + s.id}
                      className="text-xs font-medium text-white rounded-md px-3 py-1.5"
                      style={{ backgroundColor: '#7A9A4A' }}>
                      Edit
                    </Link>
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

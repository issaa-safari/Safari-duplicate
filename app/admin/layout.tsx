import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminProfile } from '@/lib/auth/admin-access'
import AdminSidebar from './sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <>{children}</>

  const admin = createAdminClient()
  const adminProfile = await getAdminProfile(admin, user.email)
  if (!adminProfile) return <>{children}</>

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3">
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-700 font-medium">{adminProfile?.full_name ?? user.email}</span>
            <span className="text-xs text-gray-400">{adminProfile?.role}</span>
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

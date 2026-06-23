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
    <div className="min-h-screen bg-[#f3f3f1]">
      <AdminSidebar
        fullName={adminProfile?.full_name ?? user.email ?? 'Admin'}
        role={adminProfile?.role ?? 'admin'}
      />
      <main className="min-h-[calc(100vh-88px)]">
        {children}
      </main>
    </div>
  )
}

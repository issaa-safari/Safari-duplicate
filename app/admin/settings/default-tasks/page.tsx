import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DefaultTaskManager from './default-task-manager'

export default async function DefaultTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: tasks } = await admin
    .from('default_tasks')
    .select('id, description, type, sort_order, is_active')
    .order('sort_order', { ascending: true })

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/settings" className="text-xs text-gray-400 hover:text-gray-600">← Settings</Link>
        <h1 className="text-lg font-semibold text-gray-900 mt-2">Default Tasks</h1>
        <p className="text-sm text-gray-500 mt-0.5">The checklist auto-created when a request is booked</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <DefaultTaskManager tasks={tasks ?? []} />
      </div>
    </div>
  )
}

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
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <Link href="/admin/settings" className="text-xs text-muted-foreground hover:text-foreground">← Settings</Link>
        <h1 className="text-lg font-semibold text-foreground mt-2">Default Tasks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">The checklist auto-created when a request is booked</p>
      </div>
      <div className="rounded-xl border border-border bg-surface shadow-sm p-6">
        <DefaultTaskManager tasks={tasks ?? []} />
      </div>
    </div>
  )
}

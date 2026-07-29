import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import StatusBadge from '@/components/admin/status-badge'
import { EmptyState } from '@/components/admin/ui/empty-state'
import type { Lead } from '@/lib/types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function LeadsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  const rows = (leads ?? []) as Lead[]

  return (
    <div className="flex-1 p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          WhatsApp Flow intake submissions, newest first.
        </p>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No leads yet"
          body="Completed WhatsApp Flow enquiries will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Tour</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatDate(lead.created_at)}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {lead.full_name || '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{lead.phone_number || '—'}</div>
                    {lead.email && <div className="text-xs">{lead.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.tour_type || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.travel_dates || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

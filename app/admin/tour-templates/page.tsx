import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TourTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: templates } = await admin
    .from('quotes')
    .select(`
      id, quote_number, created_at,
      clients (first_name, last_name),
      quote_versions (title, version_number, travel_start_date, travel_end_date, total_selling_usd)
    `)
    .eq('is_template', true)
    .order('created_at', { ascending: false })

  const rows = templates ?? []

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Tour Templates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Reusable quotes you can copy into any request — itinerary and pricing included.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface shadow-sm p-8 text-center">
          <p className="text-sm text-muted-foreground">No templates yet.</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
            Open any quote and choose <span className="font-medium">“Save as template”</span> to add it here.
            Then, on a request’s Quotes tab, pick <span className="font-medium">“Start from template”</span> to
            copy it into a new quote.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((t: any) => {
            const latest = (t.quote_versions ?? []).sort((a: any, b: any) => b.version_number - a.version_number)[0]
            return (
              <Link key={t.id} href={`/admin/quotes/${t.id}`}
                className="block rounded-xl border border-border bg-surface shadow-sm p-4 hover:border-primary-strong hover:shadow-sm transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-accent text-[var(--olive-dk)] px-2 py-0.5 rounded-full font-medium">Template</span>
                      <span className="text-xs text-muted-foreground font-mono">{t.quote_number}</span>
                    </div>
                    <p className="font-medium text-foreground">{latest?.title || 'Untitled template'}</p>
                    {latest?.travel_start_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sample dates: {new Date(latest.travel_start_date).toLocaleDateString('en-GB')}
                        {latest.travel_end_date ? ` – ${new Date(latest.travel_end_date).toLocaleDateString('en-GB')}` : ''}
                      </p>
                    )}
                  </div>
                  {latest?.total_selling_usd != null && (
                    <span className="text-sm font-semibold text-foreground shrink-0">
                      ${Number(latest.total_selling_usd).toLocaleString()}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

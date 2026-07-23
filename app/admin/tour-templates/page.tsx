import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import TemplatesListClient, { type TemplateRow } from './templates-list-client'

export default async function TourTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()

  // Separate queries to avoid PostgREST FK ambiguity: quotes ↔ quote_versions
  // has two relationships (quote_versions.quote_id and quotes.accepted_version_id),
  // so an embedded quote_versions(...) select errors out and returns no rows.
  const { data: rows } = await admin
    .from('quotes')
    .select('id, quote_number, created_at')
    .eq('is_template', true)
    .order('created_at', { ascending: false })

  const templateQuotes = rows ?? []
  const quoteIds = templateQuotes.map((q: any) => q.id)

  const { data: versionsData } = quoteIds.length
    ? await admin
        .from('quote_versions')
        .select('quote_id, title, version_number, travel_start_date, travel_end_date, total_selling_usd')
        .in('quote_id', quoteIds)
        .order('version_number', { ascending: false })
    : { data: [] }

  const versionsByQuote: Record<string, any[]> = {}
  for (const v of (versionsData ?? [])) {
    if (!versionsByQuote[v.quote_id]) versionsByQuote[v.quote_id] = []
    versionsByQuote[v.quote_id].push(v)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Quote Templates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Reusable quotes you can copy into any request — itinerary and pricing included.
        </p>
      </div>

      {templateQuotes.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface shadow-sm p-8 text-center">
          <p className="text-sm text-muted-foreground">No templates yet.</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
            Open any quote and choose <span className="font-medium">“Save as template”</span> to add it here.
            Then, on a request’s Quotes tab, pick <span className="font-medium">“Start from template”</span> to
            copy it into a new quote.
          </p>
        </div>
      ) : (
        <TemplatesListClient
          templates={templateQuotes.map((t: any): TemplateRow => {
            const latest = (versionsByQuote[t.id] ?? [])[0]
            return {
              id: t.id,
              quoteNumber: t.quote_number,
              title: latest?.title ?? '',
              travelStartDate: latest?.travel_start_date ?? null,
              travelEndDate: latest?.travel_end_date ?? null,
              totalSellingUsd: latest?.total_selling_usd ?? null,
            }
          })}
        />
      )}
    </div>
  )
}

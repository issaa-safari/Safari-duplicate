import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Map, LayoutTemplate } from 'lucide-react'
import PageHeader from '@/components/admin/page-header'
import TripBuilderForm from './trip-builder-form'
import { loadBuilderLookups } from './load-lookups'
import { loadTripBuilderInitialState } from './load-initial-state'
import type { TripBuilderState } from './types'

function nightsBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const n = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000)
  return n > 0 ? n : null
}

interface TemplateVersion {
  title: string | null
  version_number: number
  travel_start_date: string | null
  travel_end_date: string | null
  total_selling_usd: number | null
}

interface TemplateQuote {
  id: string
  quote_number: string
  created_at: string
  quote_versions: TemplateVersion[] | null
}

export default async function TripBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; template?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { start, template } = await searchParams

  // Start screen (Lovable design): choose blank or template before the form.
  if (!start && !template) {
    const { data: templates } = await admin
      .from('quotes')
      .select('id, quote_number, created_at, quote_versions (title, version_number, travel_start_date, travel_end_date, total_selling_usd)')
      .eq('is_template', true)
      .order('created_at', { ascending: false })
      .limit(6)

    const rows = ((templates ?? []) as unknown as TemplateQuote[]).map((t) => {
      const latest = [...(t.quote_versions ?? [])]
        .sort((a, b) => b.version_number - a.version_number)[0]
      return {
        id: t.id,
        quoteNumber: t.quote_number,
        title: latest?.title || 'Untitled template',
        nights: nightsBetween(latest?.travel_start_date ?? null, latest?.travel_end_date ?? null),
        priceUsd: latest?.total_selling_usd != null ? Number(latest.total_selling_usd) : null,
      }
    })

    return (
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        <PageHeader title="Trip Builder" subtitle="Choose how you want to start." />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Map size={18} />
            </span>
            <h2 className="mt-3 font-semibold text-gray-900">Blank itinerary</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Build from scratch, day by day.</p>
            <Link
              href="/admin/trip-builder?start=blank"
              className="mt-4 inline-block rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Start blank →
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <LayoutTemplate size={18} />
            </span>
            <h2 className="mt-3 font-semibold text-gray-900">From a template</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Reuse a proven tour structure.</p>
            <a
              href="#templates"
              className="mt-4 inline-block rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Pick template →
            </a>
          </div>
        </div>

        <div id="templates">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent templates</h2>
            <Link href="/admin/tour-templates" className="text-xs text-[var(--olive)] hover:underline">
              All templates
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
              <p className="text-sm text-gray-500">No templates yet.</p>
              <p className="mx-auto mt-2 max-w-md text-xs text-gray-400">
                Open any quote and choose <span className="font-medium">&ldquo;Save as template&rdquo;</span> to
                make it reusable here. <Link href="/admin/tour-templates" className="text-[var(--olive)] hover:underline">Learn more</Link>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rows.map(t => (
                <div key={t.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{t.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {t.nights != null ? `${t.nights} night${t.nights === 1 ? '' : 's'}` : t.quoteNumber}
                      {t.priceUsd != null ? ` · from $${t.priceUsd.toLocaleString()}` : ''}
                    </p>
                  </div>
                  <Link
                    href={`/admin/trip-builder?template=${t.id}`}
                    className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Use →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Builder form — blank, or prefilled from a template (guest details and sale
  // price cleared so Save creates a brand-new quote for a new client).
  const lookups = await loadBuilderLookups(admin)
  let initialState: TripBuilderState | null = null
  let templateNote: string | null = null
  if (template) {
    const loaded = await loadTripBuilderInitialState(admin, template)
    if (loaded) {
      initialState = {
        ...loaded.initialState,
        guest: { ...loaded.initialState.guest, name: '', email: '', phone: '' },
        salePrice: '',
      }
      templateNote = loaded.initialState.title || 'template'
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        className="mb-5"
        title="Trip Builder"
        subtitle={templateNote
          ? `Prefilled from “${templateNote}” — add guest details and adjust dates, then Save to create a new quote.`
          : 'Build a quote on one screen — rates resolve by travel date, one Save writes everything.'}
        actions={
          <Link href="/admin/trip-builder" className="text-xs text-[var(--olive)] hover:underline">
            ← Start over
          </Link>
        }
      />
      <TripBuilderForm {...lookups} initialState={initialState} />
    </div>
  )
}

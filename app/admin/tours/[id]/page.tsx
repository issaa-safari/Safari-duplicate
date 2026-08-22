import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import TourEditForm from './tour-edit-form'
import TourSeoEditor, { type InitialSeo, type Section, type Template, type TourSeoTour } from './tour-seo-editor'

type ItineraryDay = {
  id: string
  day_number: number
  day_number_end?: number | null
  title_en?: string | null
}

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { id } = await params
  const admin = createAdminClient()

  const [{ data: tour }, { data: days }, { data: templates }, { data: seo }, { data: sections }, { data: existingSeo }] = await Promise.all([
    admin.from('tours').select('*').eq('id', id).single(),
    admin.from('tour_days').select('id, day_number, day_number_end, title_en, destination_id').eq('tour_id', id).order('day_number', { ascending: true }),
    admin.from('tour_templates').select('id, key, name_en, name_ar, config_json, sort_order').eq('is_active', true).order('sort_order', { ascending: true }),
    admin.from('tour_seo').select('*').eq('tour_id', id).maybeSingle(),
    admin.from('tour_content_sections').select('*').eq('tour_id', id).order('sort_order', { ascending: true }),
    admin.from('tour_seo').select('seo_title_en, seo_title_ar, meta_description_en, meta_description_ar').neq('tour_id', id),
  ])

  if (!tour) notFound()

  return (
    <div className="max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Link href="/admin/tours" className="text-sm text-muted-foreground hover:text-foreground">
          Back to Tours
        </Link>
        <div className="flex-1 min-w-[240px]">
          <h1 className="text-xl font-semibold text-foreground">{tour.title_en}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={"text-xs px-2 py-0.5 rounded-full font-medium " +
              (tour.status === 'active' ? 'bg-green-100 text-green-700' :
               tour.status === 'draft' ? 'bg-amber-100 text-warning-foreground' :
               'bg-muted text-muted-foreground')}>
              {tour.status}
            </span>
            <span className="text-xs text-muted-foreground">{tour.type}</span>
            {!tour.show_on_website && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700">Hidden · 404 public</span>}
          </div>
        </div>
        <Link href={"/admin/tours/" + tour.id + "/days"}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
          Edit Itinerary
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <TourEditForm tour={tour} />
        </div>

        <div className="space-y-6 min-w-0 xl:sticky xl:top-20">
          <TourSeoEditor
            tour={tour as TourSeoTour}
            templates={(templates ?? []) as Template[]}
            initialSeo={seo as InitialSeo | null}
            initialSections={(sections ?? []) as Section[]}
            itineraryCount={days?.length ?? 0}
            existingSeo={existingSeo ?? []}
          />

          <div className="rounded-xl border border-border bg-surface shadow-sm p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Quick Stats</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="text-foreground">{tour.duration_days} days</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="text-foreground capitalize">{tour.type}</span></div>
              {tour.total_distance_km && <div className="flex justify-between"><span className="text-muted-foreground">Distance</span><span className="text-foreground">{tour.total_distance_km}km</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Max group</span><span className="text-foreground">{tour.max_group_size} people</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Deposit</span><span className="text-foreground">{tour.deposit_percent}%</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Itinerary days</span><span className="text-foreground">{days?.length ?? 0} built</span></div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface shadow-sm p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Itinerary Preview</h2>
            {days && days.length > 0 ? (
              <ul className="space-y-2">
                {(days as ItineraryDay[]).map((day) => (
                  <li key={day.id} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Day {day.day_number}{day.day_number_end ? '-' + day.day_number_end : ''}</span>
                    {' — '}{day.title_en || 'No title set'}
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-muted-foreground">No itinerary built yet.</p>}
            <Link href={"/admin/tours/" + tour.id + "/days"} className="mt-3 block text-xs text-brand-text hover:underline">Build itinerary →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

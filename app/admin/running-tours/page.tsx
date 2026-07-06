import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isTripRunning, dayOfTrip } from '@/lib/running-tours'

export default async function RunningToursPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data: booked } = await admin
    .from('requests')
    .select(`
      id, reference,
      clients (first_name, last_name),
      quotes (accepted_version_id, quote_versions (id, travel_start_date, travel_end_date)),
      request_staff_assignments (tour_staff (name, role)),
      request_vehicle_assignments (vehicles (name, type))
    `)
    .eq('stage', 'booked')

  const now = new Date()

  const running = (booked ?? [])
    .map((r: any) => {
      // Resolve the accepted (or first dated) version's travel window.
      let start: string | null = null
      let end: string | null = null
      for (const q of r.quotes ?? []) {
        const versions = q.quote_versions ?? []
        const accepted = versions.find((v: any) => v.id === q.accepted_version_id)
        const chosen = accepted ?? versions.find((v: any) => v.travel_start_date && v.travel_end_date)
        if (chosen?.travel_start_date && chosen?.travel_end_date) {
          start = chosen.travel_start_date; end = chosen.travel_end_date; break
        }
      }
      return { r, start, end }
    })
    .filter(({ start, end }) => isTripRunning(start, end, now))
    .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900">Running Tours</h1>
        <p className="text-sm text-gray-500 mt-0.5">Booked trips currently on the road today.</p>
      </div>

      {running.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <p className="text-sm text-gray-500">No tours are running today.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {running.map(({ r, start, end }) => {
            const client = r.clients
            const name = client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() : 'Unknown'
            const day = dayOfTrip(start, end, now)
            const totalDays = start && end
              ? Math.floor((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1 : null
            const staff = (r.request_staff_assignments ?? []).map((a: any) => a.tour_staff?.name).filter(Boolean)
            const vehicles = (r.request_vehicle_assignments ?? []).map((a: any) => a.vehicles?.name).filter(Boolean)
            return (
              <Link key={r.id} href={`/admin/requests/${r.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-[var(--olive)] hover:shadow-sm transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400 font-mono">{r.reference}</span>
                      {day && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Day {day}{totalDays ? ` of ${totalDays}` : ''}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {start && new Date(start).toLocaleDateString('en-GB')} – {end && new Date(end).toLocaleDateString('en-GB')}
                    </p>
                    {(staff.length > 0 || vehicles.length > 0) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {staff.length > 0 && <>👤 {staff.join(', ')}</>}
                        {staff.length > 0 && vehicles.length > 0 && ' · '}
                        {vehicles.length > 0 && <>🚙 {vehicles.join(', ')}</>}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

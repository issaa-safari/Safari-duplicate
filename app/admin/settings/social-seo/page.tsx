import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SocialSeoEditor from './social-seo-editor'

export default async function SocialSeoSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const [{ data: profiles }, { data: videos }, { data: tours }, { data: destinations }] = await Promise.all([
    admin.from('social_profiles').select('*').order('sort_order'),
    admin.from('social_videos').select('*').order('sort_order'),
    admin.from('tours').select('id, title_en, status, show_on_website').order('title_en'),
    admin.from('destinations').select('id, name').eq('is_active', true).order('name'),
  ])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Social &amp; SEO</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage official profiles and approved contextual videos. Blank profile URLs are never published.</p>
      </div>
      <SocialSeoEditor profiles={profiles ?? []} videos={videos ?? []} tours={tours ?? []} destinations={destinations ?? []} />
    </div>
  )
}

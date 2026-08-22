'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SOCIAL_PLATFORMS, type SocialProfile, type SocialVideo } from '@/lib/social'

type TourOption = { id: string; title_en: string; status: string; show_on_website: boolean }
type DestinationOption = { id: string; name: string }

const inputCls = 'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50'
const labelCls = 'mb-1 block text-xs font-medium text-muted-foreground'

export default function SocialSeoEditor({ profiles: initialProfiles, videos: initialVideos, tours, destinations }: { profiles: SocialProfile[]; videos: SocialVideo[]; tours: TourOption[]; destinations: DestinationOption[] }) {
  const router = useRouter()
  const [profiles, setProfiles] = useState(initialProfiles)
  const [videos, setVideos] = useState(initialVideos)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const updateProfile = (id: string, patch: Partial<SocialProfile>) => setProfiles((current) => current.map((profile) => profile.id === id ? { ...profile, ...patch } : profile))
  const updateVideo = (id: string, patch: Partial<SocialVideo>) => setVideos((current) => current.map((video) => video.id === id ? { ...video, ...patch } : video))

  function addVideo() {
    const id = `new-${crypto.randomUUID()}`
    setVideos((current) => [...current, {
      id, platform: 'instagram', post_url: '', external_id: null, thumbnail_url: null,
      title_en: null, title_ar: null, description_en: null, description_ar: null,
      tour_id: null, destination_id: null, is_featured: false, is_published: false,
      sort_order: current.length,
    }])
  }

  async function save() {
    setSaving(true); setMessage(''); setError('')
    try {
      const response = await fetch('/api/admin/social-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profiles, videos }),
      })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json.error || 'Could not save social settings.')
      setMessage('Social profiles and videos saved.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save social settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-foreground">Official Social Profiles</h2><p className="mt-1 text-xs text-muted-foreground">Only enabled, valid HTTPS profile URLs appear publicly and in sameAs schema.</p></div>
          <button type="button" onClick={save} disabled={saving} className="rounded-md bg-bush px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save All'}</button>
        </div>
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div key={profile.id} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-border p-3 md:grid-cols-[150px_minmax(0,1fr)_120px_90px]">
              <div><label className={labelCls}>Platform</label><select value={profile.platform} onChange={(event) => updateProfile(profile.id, { platform: event.target.value })} className={inputCls}>{SOCIAL_PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}</select></div>
              <div><label className={labelCls}>Official profile URL</label><input type="url" value={profile.profile_url ?? ''} onChange={(event) => updateProfile(profile.id, { profile_url: event.target.value })} placeholder={`https://${profile.platform}.com/...`} className={inputCls} /></div>
              <div><label className={labelCls}>Display order</label><input type="number" min={0} value={profile.sort_order} onChange={(event) => updateProfile(profile.id, { sort_order: Number(event.target.value) || 0 })} className={inputCls} /></div>
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={profile.is_enabled} onChange={(event) => updateProfile(profile.id, { is_enabled: event.target.checked })} /> Enabled</label>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-foreground">Social Video Library</h2><p className="mt-1 text-xs text-muted-foreground">Videos stay private until Published is enabled. Featured videos can appear on the homepage.</p></div>
          <button type="button" onClick={addVideo} className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">Add Video</button>
        </div>
        {videos.length === 0 ? <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No videos yet.</p> : (
          <div className="space-y-4">
            {videos.map((video, index) => (
              <div key={video.id} className="rounded-lg border border-border p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div><label className={labelCls}>Platform</label><select value={video.platform} onChange={(event) => updateVideo(video.id, { platform: event.target.value })} className={inputCls}>{SOCIAL_PLATFORMS.filter((platform) => platform !== 'whatsapp').map((platform) => <option key={platform} value={platform}>{platform}</option>)}</select></div>
                  <div className="md:col-span-2"><label className={labelCls}>Post URL</label><input type="url" required value={video.post_url} onChange={(event) => updateVideo(video.id, { post_url: event.target.value })} className={inputCls} placeholder="Paste the real Instagram, TikTok, Snapchat, YouTube or Facebook post URL" /></div>
                  <div><label className={labelCls}>Title EN</label><input value={video.title_en ?? ''} onChange={(event) => updateVideo(video.id, { title_en: event.target.value })} className={inputCls} /></div>
                  <div><label className={labelCls}>Title AR</label><input dir="rtl" value={video.title_ar ?? ''} onChange={(event) => updateVideo(video.id, { title_ar: event.target.value })} className={inputCls} /></div>
                  <div><label className={labelCls}>Thumbnail URL</label><input type="url" value={video.thumbnail_url ?? ''} onChange={(event) => updateVideo(video.id, { thumbnail_url: event.target.value })} className={inputCls} /></div>
                  <div><label className={labelCls}>Description EN</label><textarea rows={3} value={video.description_en ?? ''} onChange={(event) => updateVideo(video.id, { description_en: event.target.value })} className={inputCls} /></div>
                  <div><label className={labelCls}>Description AR</label><textarea rows={3} dir="rtl" value={video.description_ar ?? ''} onChange={(event) => updateVideo(video.id, { description_ar: event.target.value })} className={inputCls} /></div>
                  <div className="space-y-3">
                    <div><label className={labelCls}>Related tour</label><select value={video.tour_id ?? ''} onChange={(event) => updateVideo(video.id, { tour_id: event.target.value || null })} className={inputCls}><option value="">None</option>{tours.map((tour) => <option key={tour.id} value={tour.id}>{tour.title_en}{tour.status !== 'active' || !tour.show_on_website ? ' (not public)' : ''}</option>)}</select></div>
                    <div><label className={labelCls}>Related destination</label><select value={video.destination_id ?? ''} onChange={(event) => updateVideo(video.id, { destination_id: event.target.value || null })} className={inputCls}><option value="">None</option>{destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}</select></div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-5 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={video.is_published} onChange={(event) => updateVideo(video.id, { is_published: event.target.checked })} /> Published</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={video.is_featured} onChange={(event) => updateVideo(video.id, { is_featured: event.target.checked })} /> Featured</label>
                  <label className="flex items-center gap-2">Order <input type="number" min={0} value={video.sort_order ?? index} onChange={(event) => updateVideo(video.id, { sort_order: Number(event.target.value) || 0 })} className="w-20 rounded-md border border-border px-2 py-1" /></label>
                  {video.id.startsWith('new-') && <button type="button" onClick={() => setVideos((current) => current.filter((item) => item.id !== video.id))} className="ml-auto text-sm text-destructive hover:underline">Remove unsaved</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {(message || error) && <p className={`text-sm ${error ? 'text-destructive' : 'text-green-700'}`}>{error || message}</p>}
      <div className="flex justify-end"><button type="button" onClick={save} disabled={saving} className="rounded-md bg-bush px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save Social & SEO'}</button></div>
    </div>
  )
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { isAllowedSocialUrl, SOCIAL_PLATFORMS } from '@/lib/social'

const textOrNull = (value: unknown) => typeof value === 'string' ? value.trim() || null : null
const int = (value: unknown, fallback = 0) => Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : fallback
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  try {
    await assertAdminAccess(admin, user.email)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed: unknown = await request.json().catch(() => ({}))
  const body = isRecord(parsed) ? parsed : {}
  const profiles = Array.isArray(body.profiles) ? body.profiles.slice(0, SOCIAL_PLATFORMS.length).filter(isRecord) : []
  const videos = Array.isArray(body.videos) ? body.videos.slice(0, 100).filter(isRecord) : []
  const profilePlatforms = profiles.map((profile) => profile.platform)
  if (new Set(profilePlatforms).size !== profilePlatforms.length) return NextResponse.json({ error: 'Each social platform can only appear once.' }, { status: 400 })

  const profileRows = []
  for (const profile of profiles) {
    const platform = typeof profile.platform === 'string' ? profile.platform : ''
    const profileUrl = textOrNull(profile.profile_url)
    if (!SOCIAL_PLATFORMS.includes(platform as (typeof SOCIAL_PLATFORMS)[number])) return NextResponse.json({ error: `Unsupported social platform: ${platform || 'blank'}.` }, { status: 400 })
    if (profileUrl && !isAllowedSocialUrl(platform, profileUrl)) return NextResponse.json({ error: `The ${platform} profile URL must be an HTTPS URL on the official ${platform} domain.` }, { status: 400 })
    profileRows.push({ id: profile.id, platform, profile_url: profileUrl, handle: textOrNull(profile.handle), is_enabled: profile.is_enabled === true, sort_order: int(profile.sort_order), updated_at: new Date().toISOString() })
  }

  if (profileRows.length > 0) {
    const { error } = await admin.from('social_profiles').upsert(profileRows, { onConflict: 'id' })
    if (error) return NextResponse.json({ error: 'Could not save social profiles.' }, { status: 500 })
  }

  const existingRows = []
  const newRows = []
  for (const video of videos) {
    const platform = typeof video.platform === 'string' ? video.platform : ''
    const postUrl = textOrNull(video.post_url)
    if (!postUrl) {
      if (String(video.id ?? '').startsWith('new-')) continue
      return NextResponse.json({ error: 'Every saved social video needs a post URL.' }, { status: 400 })
    }
    if (!isAllowedSocialUrl(platform, postUrl)) return NextResponse.json({ error: `A ${platform || 'social'} video URL must use the matching official HTTPS domain.` }, { status: 400 })
    const row = {
      platform,
      post_url: postUrl,
      external_id: textOrNull(video.external_id),
      thumbnail_url: textOrNull(video.thumbnail_url),
      title_en: textOrNull(video.title_en),
      title_ar: textOrNull(video.title_ar),
      description_en: textOrNull(video.description_en),
      description_ar: textOrNull(video.description_ar),
      tour_id: textOrNull(video.tour_id),
      destination_id: textOrNull(video.destination_id),
      is_featured: video.is_featured === true,
      is_published: video.is_published === true,
      sort_order: int(video.sort_order),
      published_at: video.is_published === true ? (textOrNull(video.published_at) || new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    }
    if (String(video.id).startsWith('new-')) newRows.push(row)
    else existingRows.push({ ...row, id: video.id })
  }

  if (existingRows.length > 0) {
    const { error } = await admin.from('social_videos').upsert(existingRows, { onConflict: 'id' })
    if (error) return NextResponse.json({ error: 'Could not update social videos.' }, { status: 500 })
  }
  if (newRows.length > 0) {
    const { error } = await admin.from('social_videos').insert(newRows)
    if (error) return NextResponse.json({ error: 'Could not add social videos.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'snapchat', 'youtube', 'facebook', 'whatsapp'] as const
export type SocialPlatform = typeof SOCIAL_PLATFORMS[number]

export type SocialProfile = {
  id: string
  platform: string
  profile_url: string | null
  handle?: string | null
  is_enabled: boolean
  sort_order: number
}

export type SocialVideo = {
  id: string
  platform: string
  post_url: string
  external_id?: string | null
  thumbnail_url?: string | null
  title_en?: string | null
  title_ar?: string | null
  description_en?: string | null
  description_ar?: string | null
  tour_id?: string | null
  destination_id?: string | null
  is_featured: boolean
  is_published: boolean
  sort_order: number
}

const PLATFORM_HOSTS: Record<string, string[]> = {
  instagram: ['instagram.com', 'www.instagram.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'],
  snapchat: ['snapchat.com', 'www.snapchat.com'],
  youtube: ['youtube.com', 'www.youtube.com', 'youtu.be'],
  facebook: ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com'],
  whatsapp: ['wa.me', 'whatsapp.com', 'www.whatsapp.com'],
}

export function isAllowedSocialUrl(platform: string, value: string): boolean {
  if (!SOCIAL_PLATFORMS.includes(platform as SocialPlatform)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (PLATFORM_HOSTS[platform] ?? []).includes(url.hostname.toLowerCase())
  } catch {
    return false
  }
}

export function socialEmbedUrl(video: Pick<SocialVideo, 'platform' | 'post_url' | 'external_id'>): string | null {
  if (!isAllowedSocialUrl(video.platform, video.post_url)) return null
  const url = new URL(video.post_url)
  if (video.platform === 'instagram') {
    const path = url.pathname.replace(/\/+$/, '')
    if (!/^\/(p|reel|tv)\/[A-Za-z0-9_-]+$/.test(path)) return null
    return `https://www.instagram.com${path}/embed/`
  }
  if (video.platform === 'tiktok') {
    const id = video.external_id || url.pathname.match(/\/video\/(\d+)/)?.[1]
    return id && /^\d+$/.test(id) ? `https://www.tiktok.com/player/v1/${id}` : null
  }
  if (video.platform === 'youtube') {
    const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.match(/\/shorts\/([^/]+)/)?.[1]
    return id && /^[A-Za-z0-9_-]+$/.test(id) ? `https://www.youtube.com/embed/${id}` : null
  }
  return null
}

export function enabledProfileUrls(profiles: SocialProfile[]): string[] {
  return profiles
    .filter((profile) => profile.is_enabled && profile.profile_url && isAllowedSocialUrl(profile.platform, profile.profile_url))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((profile) => profile.profile_url!)
}

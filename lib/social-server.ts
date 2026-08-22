import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { SocialProfile } from '@/lib/social'

export const getPublicSocialProfiles = cache(async (): Promise<SocialProfile[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('social_profiles')
    .select('id, platform, profile_url, handle, is_enabled, sort_order')
    .eq('is_enabled', true)
    .not('profile_url', 'is', null)
    .order('sort_order')
  return (data ?? []) as SocialProfile[]
})

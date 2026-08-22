import { describe, expect, it } from 'vitest'
import { enabledProfileUrls, isAllowedSocialUrl, socialEmbedUrl } from './social'

describe('social publishing safety', () => {
  it('accepts only HTTPS URLs on the selected official platform host', () => {
    expect(isAllowedSocialUrl('instagram', 'https://www.instagram.com/example')).toBe(true)
    expect(isAllowedSocialUrl('instagram', 'https://example.com/instagram')).toBe(false)
    expect(isAllowedSocialUrl('tiktok', 'http://www.tiktok.com/@example')).toBe(false)
  })

  it('builds lazy embed URLs only for supported post formats', () => {
    expect(socialEmbedUrl({ platform: 'instagram', post_url: 'https://www.instagram.com/reel/ABC_123/', external_id: null })).toBe('https://www.instagram.com/reel/ABC_123/embed/')
    expect(socialEmbedUrl({ platform: 'tiktok', post_url: 'https://www.tiktok.com/@user/video/123456', external_id: null })).toBe('https://www.tiktok.com/player/v1/123456')
    expect(socialEmbedUrl({ platform: 'snapchat', post_url: 'https://www.snapchat.com/p/abc', external_id: null })).toBeNull()
  })

  it('keeps sameAs limited to enabled, valid profile URLs', () => {
    const urls = enabledProfileUrls([
      { id: '1', platform: 'instagram', profile_url: 'https://instagram.com/example', is_enabled: true, sort_order: 2 },
      { id: '2', platform: 'tiktok', profile_url: null, is_enabled: true, sort_order: 1 },
      { id: '3', platform: 'facebook', profile_url: 'https://example.com', is_enabled: true, sort_order: 0 },
    ])
    expect(urls).toEqual(['https://instagram.com/example'])
  })
})

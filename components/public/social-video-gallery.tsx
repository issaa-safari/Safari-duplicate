'use client'

import { useState } from 'react'
import SafariImage from '@/components/public/safari-image'
import { pageContext, trackEvent } from '@/lib/analytics'
import { socialEmbedUrl, type SocialVideo } from '@/lib/social'
import type { Locale } from '@/lib/locale'

export default function SocialVideoGallery({ videos, locale, heading }: { videos: SocialVideo[]; locale: Locale; heading?: string }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const isAr = locale === 'ar'
  if (videos.length === 0) return null

  return (
    <section aria-labelledby="social-video-heading" style={{ padding: '72px 24px', background: '#EAE3D2' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 id="social-video-heading" style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 700, color: '#20271A', marginBottom: 28 }}>
          {heading ?? (isAr ? 'شاهد التجربة' : 'See the Experience')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {videos.slice(0, 6).map((video) => {
            const embedUrl = socialEmbedUrl(video)
            const active = activeId === video.id && embedUrl
            const title = (isAr ? video.title_ar || video.title_en : video.title_en || video.title_ar) || (isAr ? `فيديو ${video.platform}` : `${video.platform} video`)
            const description = isAr ? video.description_ar || video.description_en : video.description_en || video.description_ar
            return (
              <article key={video.id} style={{ overflow: 'hidden', borderRadius: 14, border: '1px solid #D8D1C2', background: '#fff' }}>
                <div style={{ position: 'relative', aspectRatio: '9 / 12', background: '#20271A' }}>
                  {active ? (
                    <iframe
                      src={embedUrl}
                      title={title}
                      loading="lazy"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      style={{ width: '100%', height: '100%', border: 0 }}
                    />
                  ) : (
                    <>
                      <SafariImage src={video.thumbnail_url} seed={video.id} alt={title} className="h-full w-full" sizes="(max-width: 768px) 100vw, 33vw" useStockFallback={false} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 35%, rgba(20,25,15,0.82))' }} />
                      {embedUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveId(video.id)
                            trackEvent('social_video_play', { ...pageContext(locale), platform: video.platform, social_video_id: video.id })
                          }}
                          aria-label={isAr ? `تشغيل ${title}` : `Play ${title}`}
                          style={{ position: 'absolute', inset: 0, border: 0, background: 'transparent', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                        >
                          <span style={{ width: 58, height: 58, borderRadius: 99, display: 'grid', placeItems: 'center', background: 'rgba(122,154,74,0.92)', fontSize: 24, paddingInlineStart: 3 }}>▶</span>
                        </button>
                      ) : (
                        <a
                          href={video.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent('social_video_open', { ...pageContext(locale), platform: video.platform, social_video_id: video.id })}
                          style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', textDecoration: 'none' }}
                        >
                          <span style={{ borderRadius: 99, background: 'rgba(122,154,74,0.92)', padding: '11px 18px', fontWeight: 700 }}>{isAr ? 'شاهد الفيديو' : 'Watch video'}</span>
                        </a>
                      )}
                    </>
                  )}
                </div>
                <div style={{ padding: 18 }}>
                  <div style={{ color: '#6E6A59', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>{video.platform}</div>
                  <h3 style={{ color: '#20271A', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{title}</h3>
                  {description && <p style={{ color: '#6E6A59', lineHeight: 1.65, fontSize: '0.9rem', margin: '9px 0 0' }}>{description}</p>}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

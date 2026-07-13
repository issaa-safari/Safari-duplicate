'use client'

import { useState } from 'react'

const OLIVE = '#7A9A4A'
const GRAD = `linear-gradient(135deg,#2f3b22 0%,#4C5E2A 60%,${OLIVE} 100%)`

// Photo with a graceful safari-green fallback: shows the gradient (not a broken
// icon) when there's no src or the image fails to load. Client component so the
// onError swap works for arbitrary cover-image hosts.
export function ProposalPhoto({ src, alt, className = '' }: { src?: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const show = src && !failed
  return (
    <div className={`flex items-center justify-center overflow-hidden ${className}`} style={{ background: GRAD }}>
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-2xl text-white/45" aria-hidden="true">◈</span>
      )}
    </div>
  )
}

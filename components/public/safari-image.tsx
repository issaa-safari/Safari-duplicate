'use client'

import Image from 'next/image'
import { useState } from 'react'
import { stockImageFor } from '@/lib/stock-images'

const GRADIENT = 'linear-gradient(135deg, #2f3b22 0%, #4C5E2A 55%, #7A9A4A 100%)'

// Renders a DB image when present, otherwise a deterministic curated stock
// safari photo. If the chosen image fails to load (bad URL, network), it
// degrades gracefully to a green safari gradient instead of a broken icon.
export default function SafariImage({
  src,
  seed,
  alt,
  className = '',
  sizes = '(max-width: 768px) 100vw, 33vw',
  priority = false,
  useStockFallback = true,
}: {
  src?: string | null
  seed: string | number
  alt: string
  className?: string
  sizes?: string
  priority?: boolean
  useStockFallback?: boolean
}) {
  const initial = src || (useStockFallback ? stockImageFor(seed) : '')
  const [failed, setFailed] = useState(false)
  const showImage = initial && !failed

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: GRADIENT }}>
      {showImage && (
        <Image
          src={initial}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

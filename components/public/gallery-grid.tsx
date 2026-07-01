'use client'

import { motion, useReducedMotion } from 'framer-motion'
import SafariImage from '@/components/public/safari-image'

interface GalleryGridProps {
  urls: string[]
  tourId: string
  alt: string
}

export default function GalleryGrid({ urls, tourId, alt }: GalleryGridProps) {
  const reduced = useReducedMotion()

  if (urls.length === 0) return null

  // Simple masonry-style: first image large, rest smaller
  const [hero, ...rest] = urls

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {/* Large hero image spans 2 rows and 2 cols on first position */}
      <motion.div
        initial={reduced ? false : { opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        whileHover={reduced ? {} : { scale: 1.015, boxShadow: '0 12px 32px rgba(32,39,26,0.18)' }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
        style={{
          gridColumn: 'span 2', gridRow: 'span 2',
          borderRadius: 14, overflow: 'hidden',
          aspectRatio: '4/3', position: 'relative',
        }}
      >
        <SafariImage
          src={hero}
          seed={`${tourId}-0`}
          alt={alt}
          className="w-full h-full"
          sizes="(max-width: 768px) 100vw, 66vw"
          priority
        />
      </motion.div>

      {rest.slice(0, 4).map((url, i) => (
        <motion.div
          key={url}
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          whileHover={reduced ? {} : { scale: 1.02 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4, delay: (i + 1) * 0.07 }}
          style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '1', position: 'relative' }}
        >
          <SafariImage
            src={url}
            seed={`${tourId}-${i + 1}`}
            alt={alt}
            className="w-full h-full"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </motion.div>
      ))}

      {/* Remaining images in a 3-col row */}
      {rest.slice(4).map((url, i) => (
        <motion.div
          key={url}
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          whileHover={reduced ? {} : { scale: 1.02 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.4, delay: i * 0.06 }}
          style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3', position: 'relative' }}
        >
          <SafariImage
            src={url}
            seed={`${tourId}-${i + 5}`}
            alt={alt}
            className="w-full h-full"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </motion.div>
      ))}
    </div>
  )
}

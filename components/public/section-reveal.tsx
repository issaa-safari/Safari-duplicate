'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

const EASE = [0.22, 1, 0.36, 1] as const

export default function SectionReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
    const reduced = useReducedMotion()

  // `initial` stays identical between server and client renders (server can't know the
  // client's prefers-reduced-motion) — only the transition duration is gated, so a
  // reduced-motion client lands on `whileInView`'s target instantly instead of a
  // hydration mismatch leaving the element stuck at its initial (invisible) state.
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.55, delay: reduced ? 0 : delay, ease: EASE }}
      viewport={{ once: true, margin: '-60px' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

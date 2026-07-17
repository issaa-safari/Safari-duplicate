// Load and validate a carousel content file. Validation warns (never blocks) so
// drafts and non-standard lengths still render — see handoff §3.
import fs from 'node:fs'

/**
 * @param {string} jsonPath absolute path to content/carousels/<slug>.json
 * @returns {{ carousel: object, warnings: string[] }}
 */
export function loadCarousel(jsonPath) {
  let carousel
  try {
    carousel = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  } catch (e) {
    throw new Error(`cannot parse ${jsonPath}: ${e.message}`)
  }

  const warnings = []
  const slides = carousel.slides
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error(`${jsonPath}: "slides" must be a non-empty array`)
  }

  if (slides.length !== 10) warnings.push(`expected 10 slides, found ${slides.length}`)

  const covers = slides.filter((s) => s.layout === 'cover').length
  const ctas = slides.filter((s) => s.layout === 'cta').length
  if (slides[0]?.layout !== 'cover') warnings.push('first slide should be a "cover"')
  if (slides[slides.length - 1]?.layout !== 'cta') warnings.push('last slide should be a "cta"')
  if (covers !== 1) warnings.push(`expected exactly one "cover", found ${covers}`)
  if (ctas !== 1) warnings.push(`expected exactly one "cta", found ${ctas}`)

  slides.forEach((s, i) => {
    const n = i + 1
    if (!s.layout) { warnings.push(`slide ${n}: missing "layout"`); return }
    if (!['cover', 'content', 'cta'].includes(s.layout)) {
      throw new Error(`${jsonPath}: slide ${n} has unknown layout "${s.layout}"`)
    }
    if (s.layout === 'cover' && !s.bandA) warnings.push(`slide ${n} (cover): missing "bandA"`)
    if (s.layout === 'content') {
      if (!s.title) warnings.push(`slide ${n} (content): missing "title"`)
      if (!s.body) warnings.push(`slide ${n} (content): missing "body"`)
    }
  })

  if (!carousel.slug) warnings.push('missing "slug" (falling back to filename)')
  return { carousel, warnings }
}

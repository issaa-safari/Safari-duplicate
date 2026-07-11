#!/usr/bin/env node
/**
 * WCAG contrast checker for the admin theme tokens (OKLCH + hex).
 * Usage: node scripts/check-contrast.mjs
 * Exits non-zero if any listed pair fails its target ratio.
 */

/* oklch → srgb (D65), per CSS Color 4 */
function oklchToRgb(L, C, H) {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3
  let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  const toSrgb = (x) => {
    x = Math.min(1, Math.max(0, x))
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
  }
  return [toSrgb(r), toSrgb(g), toSrgb(bl)]
}
const hexToRgb = (hex) => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
}
const parse = (c) => {
  if (c.startsWith('#')) return hexToRgb(c)
  const m = c.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/)
  return oklchToRgb(+m[1], +m[2], +m[3])
}
const lum = ([r, g, b]) => {
  const f = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
export function ratio(fg, bg) {
  const [l1, l2] = [lum(parse(fg)), lum(parse(bg))]
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

const white = '#FFFFFF'
const surfaceAlt = 'oklch(0.985 0.003 150)'
const adminBg = 'oklch(0.97 0.005 150)'

/* [label, fg, bg, target] */
const PAIRS = [
  ['admin-text on white', 'oklch(0.18 0.02 150)', white, 4.5],
  ['muted-foreground on white', 'oklch(0.45 0.02 150)', white, 4.5],
  ['muted-foreground on admin-bg', 'oklch(0.45 0.02 150)', adminBg, 4.5],
  ['muted-foreground on surface-alt', 'oklch(0.45 0.02 150)', surfaceAlt, 4.5],
  ['brand-text on white (links/labels)', 'oklch(0.45 0.15 143)', white, 4.5],
  ['brand-ink on white', 'oklch(0.42 0.16 143)', white, 4.5],
  ['brand-ink on accent tint', 'oklch(0.35 0.14 143)', 'oklch(0.94 0.06 143)', 4.5],
  ['primary-foreground on primary (lg text/buttons)', '#FFFFFF', 'oklch(0.55 0.18 143)', 4.5],
  ['destructive on white', 'oklch(0.5 0.22 27)', white, 4.5],
  ['warning-foreground on warning', 'oklch(0.4 0.12 70)', 'oklch(0.97 0.08 90)', 4.5],
  ['placeholder on white', 'oklch(0.55 0.015 150)', white, 4.5],
]

let failed = 0
for (const [label, fg, bg, target] of PAIRS) {
  const r = ratio(fg, bg)
  const ok = r >= target
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${label}: ${r.toFixed(2)} (target ${target})`)
}
if (failed) { console.error(`\n${failed} pair(s) fail`); process.exit(1) }

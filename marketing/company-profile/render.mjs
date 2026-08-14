/**
 * Shared headless-Chromium plumbing for build.mjs and verify.mjs.
 *
 * The one non-obvious thing here: `--window-size=W,H` sizes the *window*, not the
 * viewport. This Chromium reserves ~87px of it, so a page laid out at exactly
 * 297mm tall gets its last centimetre cut off, and a 1350px slide loses a strip
 * along the bottom edge. Rather than hard-code that offset — it differs by
 * Chromium build — we measure it once per run with a probe page and add it back.
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

export const CHROME =
  process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

export const FLAGS = [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--disable-dev-shm-usage',
  '--force-color-profile=srgb',
  '--font-render-hinting=none',
]

export function chrome(args) {
  return execFileSync(CHROME, [...FLAGS, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
}

let cachedOffset = null

/** Difference between requested window height and the viewport actually given. */
export function viewportOffset() {
  if (cachedOffset !== null) return cachedOffset

  const dir = join(tmpdir(), 'sar-profile-probe')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const probe = join(dir, 'probe.html')
  const REQUEST = 1000
  writeFileSync(
    probe,
    '<!doctype html><meta charset="utf-8"><script>' +
      'onload=()=>{document.title="VP:"+innerWidth+"x"+innerHeight}' +
      '</script>',
    'utf8',
  )

  const dom = chrome([
    '--virtual-time-budget=3000',
    `--window-size=800,${REQUEST}`,
    '--dump-dom',
    pathToFileURL(probe).href,
  ]).toString()

  const m = dom.match(/VP:(\d+)x(\d+)/)
  cachedOffset = m ? REQUEST - Number(m[2]) : 0
  return cachedOffset
}

/** Screenshot a URL at an exact CSS-pixel viewport size. */
export function screenshot({ url, file, width, height, scale = 1, budget = 8000 }) {
  const args = [
    `--screenshot=${file}`,
    `--window-size=${width},${height + viewportOffset()}`,
    `--virtual-time-budget=${budget}`,
  ]
  if (scale !== 1) args.push(`--force-device-scale-factor=${scale}`)
  args.push(url)
  return chrome(args)
}

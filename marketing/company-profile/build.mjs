/**
 * Renders the company profile to a print-ready PDF and the Instagram carousel
 * to 1080×1350 PNGs, using the Chromium that ships with this environment.
 *
 *   node build.mjs
 *
 * Regenerates assets first so a fresh clone produces identical output:
 *   fetch-assets.mjs  → assets/fonts.css (base64 Tajawal), assets/logo.b64.txt
 *   derive-palette.mjs → assets/palette.css (brand green sampled from the logo)
 */
import { execFileSync } from 'node:child_process'
import { mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { CHROME, chrome, screenshot } from './render.mjs'
import { cropPng } from './png.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'out')
const slidesDir = join(out, 'slides')


function step(label, fn) {
  process.stdout.write(`• ${label} … `)
  const r = fn()
  console.log('done')
  return r
}

async function main() {
  if (!existsSync(CHROME)) {
    throw new Error(`Chromium not found at ${CHROME} — set CHROME_PATH`)
  }

  step('assets: fonts + logo', () =>
    execFileSync(process.execPath, [join(here, 'fetch-assets.mjs')], { stdio: 'inherit' }),
  )
  step('assets: palette from logo', () =>
    execFileSync(process.execPath, [join(here, 'derive-palette.mjs')], { stdio: 'inherit' }),
  )

  await rm(out, { recursive: true, force: true })
  await mkdir(slidesDir, { recursive: true })

  const pdf = join(out, 'Safari-Adventure-Riders-Profile-AR.pdf')
  step('render profile → PDF', () =>
    chrome([
      `--print-to-pdf=${pdf}`,
      '--no-pdf-header-footer',
      '--virtual-time-budget=12000',
      join(here, 'profile-ar.html'),
    ]),
  )

  // Each slide is a full-viewport section revealed by :target, so one pass per
  // slide gives an exact 1080×1350 frame. The fragment only survives if the page
  // is passed as a real file:// URL — a bare path makes Chromium treat "#s1" as
  // part of the filename and fail with ERR_FILE_NOT_FOUND.
  const slidesUrl = pathToFileURL(join(here, 'slides-ar.html')).href
  const SLIDE_COUNT = 8
  const SLIDE_W = 1080
  const SLIDE_H = 1350
  for (let i = 1; i <= SLIDE_COUNT; i++) {
    const n = String(i).padStart(2, '0')
    const file = join(slidesDir, `${n}.png`)
    step(`render slide ${n} → PNG`, () =>
      screenshot({ url: `${slidesUrl}#s${i}`, file, width: SLIDE_W, height: SLIDE_H }),
    )
    // Chromium writes a window-sized image; trim it back to the painted 4:5 frame.
    await writeFile(file, cropPng(await readFile(file), SLIDE_W, SLIDE_H))
  }

  console.log(`\nPDF    → ${pdf}`)
  console.log(`Slides → ${slidesDir} (${(await readdir(slidesDir)).length} files)`)
}

main().catch((err) => {
  console.error('\nbuild failed:', err.message)
  process.exit(1)
})

#!/usr/bin/env node
// Render carousel content files to 1080×1350 PNGs with Playwright/Chromium.
//
//   node tools/carousel/export.mjs <slug>     # one carousel
//   node tools/carousel/export.mjs --all       # every content/carousels/*.json
//
// Output: tools/carousel/out/<slug>/01.png … NN.png
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadCarousel } from './lib/load.mjs'
import { renderSlide } from './template/slide.mjs'

const ROOT = path.dirname(fileURLToPath(import.meta.url)) // tools/carousel
const TEMPLATE_DIR = path.join(ROOT, 'template')
const CAROUSELS_DIR = path.join(ROOT, 'content', 'carousels')
const OUT_DIR = path.join(ROOT, 'out')
const LOGO = path.join(ROOT, 'assets', 'logo.png')
const CHROMIUM =
  process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium'
const CANVAS = { width: 1080, height: 1350 }

const arg = process.argv[2]
if (!arg) {
  console.error('usage: node tools/carousel/export.mjs <slug> | --all')
  process.exit(1)
}

const slugs =
  arg === '--all'
    ? fs
        .readdirSync(CAROUSELS_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/\.json$/, ''))
    : [arg.replace(/\.json$/, '')]

if (slugs.length === 0) {
  console.error(`no carousels found in ${CAROUSELS_DIR}`)
  process.exit(1)
}

const templateHref = pathToFileURL(TEMPLATE_DIR).href + '/'
const logoHref = fs.existsSync(LOGO) ? pathToFileURL(LOGO).href : null

const browser = await chromium.launch({ executablePath: CHROMIUM })
const page = await browser.newPage({ viewport: CANVAS, deviceScaleFactor: 1 })

let totalShots = 0
for (const slug of slugs) {
  const jsonPath = path.join(CAROUSELS_DIR, `${slug}.json`)
  if (!fs.existsSync(jsonPath)) {
    console.error(`!! missing ${jsonPath}`)
    process.exitCode = 1
    continue
  }
  const { carousel, warnings } = loadCarousel(jsonPath)
  const outSlug = carousel.slug || slug
  console.log(`\n▶ ${outSlug} — ${carousel.slides.length} slides`)
  for (const w of warnings) console.log(`  ⚠ ${w}`)

  const outDir = path.join(OUT_DIR, outSlug)
  fs.mkdirSync(outDir, { recursive: true })

  const total = carousel.slides.length
  for (let i = 0; i < total; i++) {
    const slide = carousel.slides[i]
    const index = i + 1

    // Resolve the photo (relative to tools/carousel/); null → placeholder.
    let photoHref = null
    if (slide.photo) {
      const abs = path.resolve(ROOT, slide.photo)
      if (fs.existsSync(abs)) photoHref = pathToFileURL(abs).href
      else console.log(`  ⚠ slide ${index}: photo not found → placeholder (${slide.photo})`)
    }

    const html = renderSlide(slide, { index, total, templateHref, logoHref, photoHref })
    // Write into the template dir so relative fonts.css/styles.css resolve
    // same-origin (file://) — avoids setContent cross-origin file blocks.
    const tmp = path.join(TEMPLATE_DIR, `.render-${outSlug}-${index}.html`)
    fs.writeFileSync(tmp, html)
    try {
      await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle', timeout: 30000 })
      await page.evaluate(async (photo) => {
        await document.fonts.ready
        if (photo) {
          const im = new Image()
          im.src = photo
          try { await im.decode() } catch {}
        }
      }, photoHref)
      await page.waitForTimeout(120)
      const file = path.join(outDir, `${String(index).padStart(2, '0')}.png`)
      await page.screenshot({ path: file, clip: { x: 0, y: 0, ...CANVAS } })
      totalShots++
      console.log(`  ✓ ${path.basename(file)}  [${slide.layout}]`)
    } finally {
      fs.rmSync(tmp, { force: true })
    }
  }
}

await browser.close()
console.log(`\ndone — ${totalShots} PNG(s) across ${slugs.length} carousel(s) → ${path.relative(process.cwd(), OUT_DIR)}`)

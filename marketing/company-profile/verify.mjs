/**
 * Renders each A4 page of profile-ar.html to a PNG so the layout can actually be
 * looked at — this environment has no PDF rasteriser, and a PDF nobody has seen
 * is a PDF nobody has checked.
 *
 *   node verify.mjs        → out/verify/page-01.png … page-13.png
 *
 * Verification-only: it copies the document to a temp file and injects CSS that
 * isolates one page at a time, so profile-ar.html itself stays clean.
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { screenshot } from './render.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = join(here, 'out', 'verify')
const tmpDir = join(here, 'out', '.tmp')

// A4 at 96dpi = 794×1123 CSS px. Rendered at 2× so Arabic joins are inspectable.
const W = 794
const H = 1123

const html = await readFile(join(here, 'profile-ar.html'), 'utf8')
const pageCount = (html.match(/<section class="page/g) ?? []).length

await rm(outDir, { recursive: true, force: true })
await rm(tmpDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })
await mkdir(tmpDir, { recursive: true })

for (let i = 1; i <= pageCount; i++) {
  const n = String(i).padStart(2, '0')
  const isolate = `
    <style>
      html, body { width: 210mm; height: 297mm; margin: 0; overflow: hidden; }
      .page { display: none !important; }
      .page:nth-of-type(${i}) { display: flex !important; position: absolute; inset: 0; }
    </style></head>`
  const tmp = join(tmpDir, `page-${n}.html`)
  // The temp copy lives in out/.tmp, so relative asset paths (palette, fonts,
  // logo) would otherwise resolve against the wrong directory — silently, since
  // a missing palette renders white text on a white page rather than erroring.
  // <base> must be injected at the TOP of <head>: it only affects URLs that come
  // after it, so placing it near </head> would leave the stylesheet links broken.
  await writeFile(
    tmp,
    html
      .replace('<head>', `<head>\n<base href="${pathToFileURL(here).href}/">`)
      .replace('</head>', isolate),
    'utf8',
  )

  screenshot({
    url: pathToFileURL(tmp).href,
    file: join(outDir, `page-${n}.png`),
    width: W,
    height: H,
    scale: 2,
    budget: 6000,
  })
  process.stdout.write(`page ${n} `)
}

await rm(tmpDir, { recursive: true, force: true })
console.log(`\n${pageCount} pages → ${outDir}`)

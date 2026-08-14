/**
 * Downloads the brand webfont and inlines every subset as a base64 data URI.
 *
 * The rendered PDF and the Instagram slides must carry their own fonts: headless
 * Chromium here has no Arabic-capable font installed, so anything not embedded
 * renders as tofu. Writing assets/fonts.css once keeps profile-ar.html and
 * slides-ar.html byte-identical in their typography.
 *
 * Tajawal is the brand's Arabic face for this document. The website's own Cairo was
 * ruled out by the owner: the repo's design system predates the real brand and
 * conflicts with it. Tajawal is the GCC-standard geometric Arabic and carries both
 * the Black display weights and a readable 400/500 body.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const assets = join(here, 'assets')

// Google Fonts serves the modern woff2 cut only to a browser-ish UA.
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const FONT_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap'

async function main() {
  await mkdir(assets, { recursive: true })

  const res = await fetch(FONT_CSS_URL, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`font css fetch failed: ${res.status}`)
  let css = await res.text()

  // Inline every font file the stylesheet references, preserving Google's
  // unicode-range splits so Arabic and Latin still resolve to the right cut.
  const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com[^)]+/g) ?? [])]
  if (urls.length === 0) throw new Error('no font files found in stylesheet')

  let inlined = 0
  for (const url of urls) {
    const font = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!font.ok) throw new Error(`font fetch failed: ${url} → ${font.status}`)
    const b64 = Buffer.from(await font.arrayBuffer()).toString('base64')
    css = css.split(url).join(`data:font/woff2;base64,${b64}`)
    inlined++
  }

  await writeFile(join(assets, 'fonts.css'), css, 'utf8')

  console.log(`fonts.css: ${inlined} font files inlined, ${(css.length / 1024).toFixed(0)} KB`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

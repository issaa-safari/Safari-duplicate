#!/usr/bin/env node
// Source draft photos for the carousels from Wikimedia Commons (freely licensed),
// downscale them, and write them into tools/carousel/photos/<slug>/.
// Attribution for every image is recorded in tools/carousel/photos/PHOTOS.md.
//
// These are placeholder/draft frames so carousels render before the operator's
// own photography is dropped in — BRAND.md still applies: swap in real,
// owned frames before anything is published.
//
//   node tools/carousel/scripts/fetch-photos.mjs [slug]   # one carousel or all
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PHOTOS = path.join(ROOT, 'photos')
const UA = 'SafariAdventureCarousel/1.0 (marketing draft tooling; contact safariadventureriders@gmail.com)'
const MAX_EDGE = 1600 // px; downscaled, re-encoded JPEG q80
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

// query + fallbacks per photo filename (basename without extension).
const QUERIES = {
  // --- skysafari-kenya ---
  '01-amboseli-sunrise': ['amboseli elephants kilimanjaro', 'amboseli elephant sunrise'],
  '02-masai-mara': ['masai mara wildebeest', 'masai mara landscape'],
  '03-amboseli-elephants': ['amboseli elephant herd', 'african elephant kilimanjaro'],
  '04-elementaita-flamingo': ['lake nakuru flamingo', 'flamingo lake kenya'],
  '05-nanyuki-mtkenya': ['mount kenya landscape', 'mount kenya peak'],
  '06-bush-flight': ['cessna caravan safari', 'bush plane airstrip africa', 'light aircraft kenya'],
  '07-halal-dining': ['safari lodge dining', 'safari camp table bush'],
  '08-family-vehicle': ['safari game drive vehicle', 'safari jeep tourists'],
  '09-migration': ['wildebeest migration mara river', 'wildebeest crossing river'],
  // --- kenya-bike-adventure ---
  '01-chalbi-pan': ['adventure motorcycle desert', 'motorcycle desert dust'],
  '02-nairobi-start': ['nairobi city skyline', 'nairobi kenya city'],
  '03-equator-nanyuki': ['mount kenya equator', 'mount kenya road'],
  '04-chalbi-desert': ['desert motorcycle sand', 'motorcycle offroad desert'],
  '05-lake-turkana': ['lake turkana kenya', 'lake turkana landscape'],
  '06-marsabit': ['misty forest mountain africa', 'foggy forest green'],
  '07-the-bikes': ['adventure motorcycle offroad', 'dual sport motorcycle dirt'],
  '08-difficulty': ['motorcycle off road mud', 'enduro motorcycle trail'],
  '09-whats-included': ['motorcycle adventure camp', 'motorbike expedition africa'],
  // --- big-five-safari ---
  '01-big-five': ['lion african savanna', 'african wildlife savanna'],
  '02-lion': ['lion masai mara', 'male lion africa'],
  '03-elephant': ['african elephant tusks', 'african elephant portrait'],
  '04-buffalo': ['Syncerus caffer masai mara', 'cape buffalo kenya', 'african buffalo savanna'],
  '05-leopard': ['leopard tree africa', 'leopard portrait'],
  '06-rhino': ['white rhino kenya', 'rhinoceros africa'],
  '07-rift-valley': ['great rift valley kenya', 'rift valley landscape'],
  '08-lodging': ['luxury safari tent camp', 'safari tented camp'],
  '09-programme': ['safari jeep game drive', 'safari vehicle savanna'],
  // --- nairobi-short-break ---
  '01-nairobi-park': ['nairobi national park skyline', 'nairobi park wildlife city'],
  '02-national-park': ['nairobi national park lion', 'giraffe nairobi skyline'],
  '03-giraffe-centre': ['giraffe nairobi', 'rothschild giraffe kenya'],
  '04-elephant-orphanage': ['baby elephant orphan', 'elephant calf keeper'],
  '05-karen-blixen': ['colonial house garden kenya', 'historic house garden africa'],
  '06-limuru-tea': ['kenya tea plantation', 'tea plantation hills'],
  '07-markets-food': ['african market crafts', 'kenya market stall'],
  '08-eta-visa': ['airplane window travel', 'passport travel document'],
  '09-getting-there': ['airplane sky travel', 'passenger jet sky'],
  // --- summer-escape ---
  '01-mara-migration': ['wildebeest migration mara river crossing', 'wildebeest herd river'],
  '02-climate': ['masai mara savanna landscape', 'savanna grassland kenya'],
  '03-great-migration': ['wildebeest herd migration', 'great migration serengeti mara'],
  '04-school-holidays': ['family safari game drive', 'children safari vehicle'],
  '05-easy-reach': ['airplane travel sky sunset', 'jet airplane clouds'],
  '06-halal-arabic': ['safari lodge dining', 'safari camp restaurant', 'lodge dinner africa'],
  '07-summer-rates': ['masai mara tented camp', 'luxury safari camp sunset'],
  '08-or-by-bike': ['adventure motorcycle africa', 'motorcycle savanna road'],
  '09-fully-handled': ['safari guide vehicle kenya', 'safari driver guide'],
}

// GET with retry/backoff on 429 + 5xx.
async function getJson(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (res.ok) return res.json()
    if (res.status === 429 || res.status >= 500) {
      await sleep(1000 * 2 ** attempt)
      continue
    }
    throw new Error(`HTTP ${res.status}`)
  }
  throw new Error('too many retries')
}

// Search Wikimedia Commons files and return normalized candidates.
async function search(query) {
  const url =
    'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: '6',
      gsrlimit: '20',
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
      iiurlwidth: String(MAX_EDGE),
    })
  const json = await getJson(url)
  const pages = json?.query?.pages ? Object.values(json.query.pages) : []
  return pages
    .map((p) => {
      const ii = p.imageinfo?.[0]
      if (!ii) return null
      const meta = ii.extmetadata || {}
      return {
        title: (p.title || '').replace(/^File:/, ''),
        thumbUrl: ii.thumburl,
        descUrl: ii.descriptionurl,
        width: ii.width,
        height: ii.height,
        license: stripHtml(meta.LicenseShortName?.value) || 'see source',
        artist: stripHtml(meta.Artist?.value) || 'unknown',
      }
    })
    .filter(Boolean)
}

// Prefer landscape, reasonably large, freely-licensed frames.
function pick(results) {
  const licensed = results.filter((r) => r.thumbUrl && !/fair use|non-free/i.test(r.license))
  const big = licensed.filter((r) => r.width >= 1000)
  const landscape = big.filter((r) => r.width >= r.height * 1.1)
  // Prefer big landscape, then any big, then any licensed (last-resort draft).
  return landscape[0] || big[0] || licensed[0] || null
}

async function fetchImage(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      const isJpg = buf[0] === 0xff && buf[1] === 0xd8
      const isPng = buf[0] === 0x89 && buf[1] === 0x50
      if (!isJpg && !isPng) throw new Error('not an image')
      return buf
    }
    if (res.status === 429 || res.status >= 500) { await sleep(1000 * 2 ** attempt); continue }
    throw new Error(`HTTP ${res.status}`)
  }
  throw new Error('too many retries')
}

const only = process.argv[2]
const attributions = []
const slugs = fs
  .readdirSync(path.join(ROOT, 'content', 'carousels'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .filter((s) => !only || s === only)

for (const slug of slugs) {
  const carousel = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'content', 'carousels', `${slug}.json`), 'utf8'),
  )
  for (const slide of carousel.slides) {
    if (!slide.photo) continue
    const rel = slide.photo // photos/<slug>/NN-name.jpg
    const base = path.basename(rel).replace(/\.[^.]+$/, '')
    const dest = path.join(ROOT, rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    const queries = QUERIES[base] || [base.replace(/-/g, ' ')]

    let chosen = null
    for (const q of queries) {
      const results = await search(q)
      chosen = pick(results)
      await sleep(400) // be polite to the API
      if (chosen) break
    }
    if (!chosen) {
      console.log(`  ✗ ${rel} — no result`)
      continue
    }
    try {
      const raw = await fetchImage(chosen.thumbUrl)
      await sharp(raw)
        .rotate()
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toFile(dest)
      const kb = Math.round(fs.statSync(dest).size / 1024)
      console.log(`  ✓ ${rel}  (${kb}KB)  ${chosen.license} — ${chosen.artist}`)
      attributions.push(
        `| \`${rel}\` | [${(chosen.title || base).replace(/\|/g, '/')}](${chosen.descUrl}) | ${chosen.artist} | ${chosen.license} |`,
      )
      await sleep(300)
    } catch (e) {
      console.log(`  ✗ ${rel} — ${e.message}`)
    }
  }
}

// Merge attribution into PHOTOS.md (append/refresh table).
const header = `# Draft photo credits

These are **draft placeholder photos** sourced from Wikimedia Commons under
Creative Commons / public-domain licenses. They let the carousels render before
Safari Adventure's own photography is available.

Per BRAND.md, replace these with owned, real frames before publishing —
especially any wildlife slide, which must show footage we actually have.

Re-generate with: \`node tools/carousel/scripts/fetch-photos.mjs\`

| File | Source | Creator | License |
|---|---|---|---|
`
// Merge with any existing rows so a single-slug re-run keeps the other credits.
const mdPath = path.join(PHOTOS, 'PHOTOS.md')
const rows = new Map() // file path -> full row
const pathOf = (row) => (row.match(/^\|\s*`([^`]+)`/) || [])[1]
if (fs.existsSync(mdPath)) {
  for (const line of fs.readFileSync(mdPath, 'utf8').split('\n')) {
    const p = pathOf(line)
    if (p) rows.set(p, line)
  }
}
for (const row of attributions) rows.set(pathOf(row), row)
const body = [...rows.values()].sort().join('\n')
fs.writeFileSync(mdPath, header + body + '\n')
console.log(`\nwrote ${rows.size} credits → tools/carousel/photos/PHOTOS.md`)

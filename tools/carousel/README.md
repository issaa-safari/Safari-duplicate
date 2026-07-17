# Carousel generator

Reusable Instagram carousel builder for Safari Adventure. One fixed design
template; every carousel is just a JSON content file + photos. Output: PNGs at
**1080×1350 (4:5), Arabic RTL**.

Adding a new carousel requires **only a new JSON + photos — no template edits.**

## Quick start

```bash
npm run carousel -- skysafari-kenya      # render one carousel
npm run carousel -- --all                # render every carousel
```

PNGs land in `out/<slug>/01.png … 10.png` (git-ignored — regenerate any time).

## Layout

```
tools/carousel/
  template/            # the fixed design system — do not fork per carousel
    styles.css         #   tokens + the three slide layouts
    slide.mjs          #   renderSlide(slide, ctx) -> standalone HTML
    fonts.css          #   self-hosted @font-face (generated)
    fonts/             #   Tajawal + Almarai woff2 subsets (offline render)
  content/carousels/   # one JSON per carousel (the only thing you edit)
  photos/              # source images, per-carousel folders (+ PHOTOS.md credits)
  assets/logo.png      # brand mark
  lib/load.mjs         # JSON loader + validation (warns, never blocks)
  export.mjs           # Playwright: render each slide -> PNG
  scripts/
    fetch-photos.mjs   # source draft photos from Wikimedia Commons
    fetch-fonts.mjs    # (re)download the self-hosted fonts
  out/<slug>/          # generated PNGs (git-ignored)
```

## Content schema

`content/carousels/<slug>.json`:

```json
{
  "slug": "skysafari-kenya",
  "title": "SkySafari Kenya",
  "track": "private",
  "slides": [
    { "layout": "cover",
      "photo": "photos/skysafari-kenya/01-amboseli-sunrise.jpg",
      "bandA": "كينيا... سفاري خمس نجوم",
      "bandB": "على بُعد ٥ ساعات فقط من الخليج ✈️" },
    { "layout": "content",
      "photo": "photos/skysafari-kenya/02-masai-mara.jpg",
      "title": "ماساي مارا",
      "eyebrow": "MASAI MARA",
      "body": "أشهر محمية في أفريقيا..." },
    { "layout": "cta" }
  ]
}
```

### The three layouts

| `layout`  | Fields                                          | Notes |
|-----------|-------------------------------------------------|-------|
| `cover`   | `photo`, `bandA` (headline), `bandB` (kicker)   | first slide |
| `content` | `photo`, `title`, `eyebrow`, `body`             | slides 2–9 |
| `cta`     | none (fixed copy); optional `bandA`/`bandB`/`footnote`/`wordmarkAr`/`wordmarkEn` overrides | last slide |

- Any slide may set `"focus": "50% 30%"` to steer the photo's focal point.
- The counter (`n/10`, LTR digits) and brand pill are generated automatically.
- Validation warns (never blocks) if a carousel isn't exactly one `cover` first,
  one `cta` last, 10 slides total — so drafts still render.

### Photos

- Drop images in `photos/<slug>/` and point each slide's `photo` at them.
- **Missing photo → a savanna-gradient placeholder with a dashed "PHOTO NEEDED"
  note renders instead**, so a carousel can be drafted before its photos exist.
- `npm run carousel:photos` sources CC-licensed draft frames from Wikimedia
  Commons into `photos/` and records credits in `photos/PHOTOS.md`. These are
  **placeholders** — per `BRAND.md`, swap in owned, real frames before publishing,
  especially any wildlife slide.

## Design system (fixed)

Sage `#5F7355` / deep `#4A5A42` · amber `#F5A623` · slate `#25291F` ·
cream `#FAF6EE`. Tajawal (headlines) + Almarai (body), self-hosted for identical
offline rendering. Do not edit these per carousel — the whole point is one
template, many content files.

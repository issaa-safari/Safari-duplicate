# العمودي للسياحة — Arabic company profile

A premium, customer-facing company profile for **العمودي للسياحة / Safari Adventure
Tours & Riders**, written for Arabic-speaking travellers from the GCC. Produces a
print-ready A4 PDF and an 8-slide Instagram carousel.

This is a marketing asset, not application code — nothing here is imported by the
Next.js app.

## Build

```bash
node build.mjs      # → out/Safari-Adventure-Riders-Profile-AR.pdf + out/slides/01..08.png
node verify.mjs     # → out/verify/page-01..13.png, one PNG per A4 page for eyeballing
```

Requires Node and the Chromium that ships with this environment. Override the
browser with `CHROME_PATH=/path/to/chrome`. Fonts are fetched from Google Fonts on
build and inlined as base64, so the outputs are fully self-contained.

## Files

| File | Purpose |
|---|---|
| `profile-ar.html` | The document — 13 A4 pages, RTL |
| `slides-ar.html` | Instagram carousel — 8 slides at 1080×1350 |
| `build.mjs` | Renders the PDF and the slides |
| `verify.mjs` | Renders each A4 page to PNG (no PDF rasteriser exists here) |
| `fetch-assets.mjs` | Downloads Tajawal, inlines it and the logo as base64 |
| `derive-palette.mjs` | Samples the brand green from the logo → `assets/palette.css` |
| `render.mjs` | Shared Chromium plumbing |
| `png.mjs` | Dependency-free PNG decode/encode/crop |
| `PHOTO-BRIEF.md` | Every image slot and how to drop real photos in |
| `REVIEW-CLAIMS.md` | **Read before sending.** What's claimed, what was left out and why |

## Brand decisions

The repo's `DESIGN.md` and the design-system bundle **conflict with the real
business**, so the real brand wins here:

- **Name.** العمودي للسياحة leads; `Safari Adventure Tours & Riders` is the Latin
  lockup. The website's "Safari Adventure Riders" and the database's "Safari
  Adventure Tours" are both out of step with the company's own stamp.
- **Logo.** `assets/logo.png` — the Africa-and-bird **SAFARI ADVENTURE TOURS**
  mark, the same file the website header, footer and dashboard render
  (`public/logo-safari-riders.png`). The helmet/stencil **SAFARI RIDERS** mark on
  the company's WhatsApp stamp is the motorcycle side of the business and is
  deliberately not used here: this profile sells safari, family and photography
  travel as much as riding, and the bird mark carries that without reading as a
  motorcycle company. On dark grounds it is knocked out to white (`.knock`).
  ⚠️ **The committed file is only 181×256px** — fine on screen, soft in print at
  cover size. Replace it with a high-resolution PNG or SVG and re-run `build.mjs`.
- **Palette.** Derived from the logo at build time, not from `DESIGN.md`. The mark
  is a gradient (#495A16 → #BECB96), so the sampler averages its green pixels
  rather than taking the modal colour, giving **#7A8A49**.
- **Type.** Tajawal, replacing the site's Cairo.

Every colour in both documents resolves to a token in the generated
`assets/palette.css` — there are no loose hex values.

## Regenerating after a logo change

`assets/palette.css` and `assets/fonts.css` are generated; `build.mjs` refreshes
both on every run. Replace `assets/logo.png` and the whole palette re-derives from
the new artwork.

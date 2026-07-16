---
name: Safari Adventure Riders
description: East African safari and motorcycle trips — lush green Kenya at riding pace, for travelers from the Gulf.
colors:
  olive: "#7A9A4A"
  olive-deep: "#3D5229"
  olive-light: "#C5D9B0"
  bush: "#20271A"
  sand: "#EAE3D2"
  gold: "#C9A24B"
  murram: "#B0492B"
  stone: "#6E6A59"
  white: "#FFFFFF"
  whatsapp: "#25D366"
  scrim: "#14190F"
typography:
  display:
    fontFamily: "Readex Pro, sans-serif"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontWeight: 400
  arabic:
    # Arabic/RTL uses a single family for both display and body (Cairo).
    # Applied via a [dir="rtl"] variable swap in app/globals.css, which
    # redefines --font-display / --font-body / --font-body-ar to --font-arabic
    # (Cairo) for all Arabic content — public site and client quote/proposal.
    fontFamily: "Cairo, sans-serif"
    fontWeight: 400
    displayWeight: 600
  admin-display:
    fontFamily: "Playfair Display, Georgia, serif"
    letterSpacing: "-0.01em"
  admin-body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.olive}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 24px"
  button-primary-hover:
    backgroundColor: "{colors.olive-deep}"
  button-secondary:
    backgroundColor: "#FFFFFF"
    textColor: "#374151"
    rounded: "{rounded.md}"
    padding: "10px 24px"
---

# Safari Adventure Riders — Design System

## 1. Overview: The Green Escape

Kenya at riding pace. For travelers from the Gulf, the draw is everything home doesn't have: rain-fed forests, lakes, open green highlands, wildlife at eye level. The visual system leads with that greenery — olive and deep forest carry the brand — while the thrill lives in the accents: murram red earth for motorcycle trails, ochre gold for private safaris. Bold, thrilling, premium; never the hushed beige of the luxury-lodge template.

One brand, two registers. The public site (`app/(public)/`, `app/page.tsx`, `app/quote/[token]/`) is the brand surface: immersive, landscape-first, every page one gesture from a WhatsApp conversation. The admin platform (`app/admin/`) is the product surface: a scoped `.admin-theme` green workspace where consultants move requests to bookings — the same identity, tuned for speed and scanability. Both surfaces ship in English and Arabic; RTL is a first-class rendering, designed simultaneously, never mirrored after the fact.

Layout uses Tailwind's default spacing scale. Public pages breathe (full-bleed imagery, generous section padding, `sand` fills between white sections); admin pages are dense and columnar, with tables that collapse into stacked label/value cards on phones (`.stack-table` / `.stack-grid` in `app/globals.css`).

## 2. Colors: The Kenyan Landscape Palette

Defined as CSS custom properties in `app/globals.css` and exposed to Tailwind via `@theme inline` (`bg-olive`, `text-stone`, ...).

| Token | Value | Character | Role |
|---|---|---|---|
| `--olive` | `#7A9A4A` | Highland olive | Primary brand, CTAs, active states |
| `--olive-dk` | `#3D5229` | Deep leaf | Hover/pressed, dark text on olive tints |
| `--olive-lt` | `#C5D9B0` | Young grass | Light borders, tints |
| `--bush` | `#20271A` | Deep forest | Dark surfaces, footer, overlays |
| `--sand` | `#EAE3D2` | Parchment cream | Quiet section fills (never the whole page) |
| `--gold` | `#C9A24B` | Ochre | Private-safari accent |
| `--murram` | `#B0492B` | Red earth | Bike-tour accent, the thrill color |
| `--stone` | `#6E6A59` | Warm grey | Secondary/body text on light grounds |
| (white) | `#FFFFFF` | Paper | Default page canvas, cards, text/scrims on dark grounds |
| (whatsapp) | `#25D366` | WhatsApp green | Meta's brand color — WhatsApp CTAs only, never decorative |
| (scrim) | `#14190F` | Night bush | Base of the `rgba(20,25,15,…)` gradients that ground text over photography |

**Admin theme (scoped, OKLCH).** Inside `.admin-theme` the legacy tokens are re-pointed to a green product system: `--primary: oklch(0.7 0.22 143)`, ink `oklch(0.42 0.16 143)`, surfaces at near-white with 150-hue tints. OKLCH is canonical for admin values; see `app/globals.css` for the complete set. Pipeline status colors are defined once in `lib/status-colors.ts` (status → variant → Tailwind classes) and shared by badges and stage filters. Never leak `.admin-theme` tokens into public pages or vice versa — the scope boundary is the design rule.

Contrast is a known debt: the PRD flags green-on-white combinations for WCAG 2.1 AA fixes. When using `--olive` for text on white, prefer `--olive-dk`.

## 3. Typography

**Public.** Readex Pro (300–700) is the display voice — geometric, open, equally at home in Latin and Arabic script. IBM Plex Sans (400–600) carries body copy; IBM Plex Sans Arabic is its RTL counterpart, loaded always, not on demand. Both directions share the same hierarchy: type decisions are made for EN and AR at once (line-height generous enough for Arabic ascenders, no letter-spacing on Arabic text).

**Admin.** Inter for the working UI (`--font-admin-sans`); Playfair Display for `h1` and `.font-display` moments (`--font-admin-display`) — a single serif flourish that keeps the workspace from feeling generic. Labels in stacked mobile tables run 11px/500 uppercase with 0.03em tracking.

## 4. Elevation

Mostly flat, tonal layering first. Public sections separate by ground color (white / `sand` / `bush`), not shadow. Where shadows appear they are quiet and structural: `shadow-sm` on cards and inputs, `shadow-lg` on modals, dropdowns, and the floating WhatsApp button. No decorative glows, no glassmorphism.

## 5. Components

- **Button** (`components/ui/button.tsx`): variants `primary` (olive → olive-deep hover, white text), `secondary` (white, gray border), `danger-text`; sizes `sm` (12px text) / `md`; `rounded-md`, `font-medium`, `transition-colors`, built-in loading state.
- **Inputs** (`components/ui/input.tsx`): white ground, gray-800 text, gray-400 placeholder. Public enquiry fields get an accent-colored `:focus-visible` outline via `--focus-accent` (defaults to olive).
- **Status badge** (`components/admin/status-badge.tsx`): pipeline states colored via `lib/status-colors.ts` variants (`VARIANT_CLASSES` chips, `VARIANT_DOT` markers).
- **Stacked tables/grids** (`.stack-table`, `.stack-grid`): on <640px, admin tables and grid editors collapse to label/value cards using `data-label` attributes — the mobile pattern for all dense admin data.
- **Public composition blocks** (`components/public/`): hero (`home-hero`, `tour-hero`), `trust-strip`, `testimonials`, `featured-departures`, `choose-your-trail` (safari vs. bike fork, gold vs. murram accents), `sticky-enquiry-bar`, floating `whatsapp-button` — the persistent primary CTA on every public page.
- **Motion**: framer-motion + `section-reveal` for scroll reveals; content must be visible by default (reveals enhance, never gate), with reduced-motion alternatives.

## 6. Do's and Don'ts

**Do**
- Lead with green: olive and deep forest carry the brand; use `murram` and `gold` as deliberate trail/safari accents.
- Design EN and AR together — check every layout in RTL before shipping; use logical properties (`ms-*`/`me-*`, `text-start`).
- Keep the WhatsApp conversation one gesture away on every public page.
- Use `--olive-dk` for olive text on white; verify 4.5:1 body contrast (known AA debt).
- Respect the theme scope: `.admin-theme` tokens in `app/admin/` only.

**Don't**
- Don't do the luxury-lodge cliché: no muted gold serif elegance, no full-bleed sunset hero with thin white text, no hushed beige pages — `sand` fills sections, never the whole canvas.
- Don't use gray text on colored grounds; tint text toward the ground's own hue instead.
- Don't ship dust-and-desert as the default mood — the audience comes for forests and lakes; red earth is the thrill accent, not the base.
- Don't gate content behind scroll-reveal animation or skip reduced-motion fallbacks.
- Don't nest cards in cards; admin density comes from tables and grids, not card stacks.

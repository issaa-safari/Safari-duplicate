---
name: safari-design-system
description: The Safari Adventure Riders brand + UI design system — canonical colors, typography, spacing, radii, shadows, motion, and reference component/UI-kit implementations. Use when building or restyling any public site, client portal, or admin UI in this repo, when you need the exact brand token values (Olive/Bush/Sand/Gold/Murram palette, Readex Pro + IBM Plex Sans, EN/AR RTL), or when checking existing UI for brand adherence.
---

# Safari Adventure Riders — Design System

The brand + UI system for **Safari Adventure Riders** (premium East-Africa
adventure travel: group motorcycle tours + private luxury safaris, Nairobi-based,
bilingual EN/AR with full RTL). This system was reverse-engineered from the live
product source, so **every value here matches production** — it is a reference
mirror of `app/globals.css`, `DESIGN.md`, and `components/public/*`, not a
separate source of truth.

> **The code wins.** If a value here ever disagrees with `app/globals.css` or
> `DESIGN.md`, those repo files are authoritative — update this reference to
> match, never the reverse.

## When to use this skill

- Building a new page or component and you need on-brand tokens/patterns.
- Restyling existing UI, or auditing it for brand adherence (radii, shadows,
  motion, fonts, warm-neutral palette).
- You need the exact hex/spacing/easing values without re-deriving them.

## The two trails

- **Ride the Bush** — group motorcycle tours. Accent **Murram** `#B0492B` (red earth).
- **Drive the Wild** — private luxury safaris. Accent **Gold** `#C9A24B` (ochre).

Never mix the two accents on one surface. **Olive** `#7A9A4A` is the master
brand color for primary CTAs across both trails.

## Palette (quick reference)

| Role | Token | Hex |
|------|-------|-----|
| Master brand / primary CTA | `--olive` | `#7A9A4A` |
| CTA hover / pressed | `--olive-dk` | `#3D5229` |
| Dark cinematic surface (hero, CTA bands, footer) | `--bush` | `#20271A` |
| Warm parchment section fill | `--sand` | `#EAE3D2` |
| Private-safari accent | `--gold` | `#C9A24B` |
| Bike-tour accent | `--murram` | `#B0492B` |
| Body text (warm grey, on light) | `--stone` | `#6E6A59` |
| Default card border (warm) | `--border-warm` | `#E5E0D8` |
| App/admin background | `--admin-bg` | `#F5F0E8` |
| WhatsApp (never restyle) | `--whatsapp` | `#25D366` |

Neutrals are **warm, never cold grey**. Full palette, warm neutrals, admin
chrome, status tints, and semantic aliases: **`tokens/colors.css`**.

## Type

- **Display / headings:** Readex Pro (bold 700, slightly tight `-0.01em`).
- **Body:** IBM Plex Sans. **Arabic:** IBM Plex Sans Arabic (first-class RTL).
- Headlines use fluid `clamp()` sizes; uppercase eyebrows get `0.1em` tracking.
- Full scale, weights, line-heights: **`tokens/typography.css`**;
  webfont `@import`: **`tokens/fonts.css`**.

## Radii, shadows, motion (from `tokens/effects.css`)

- **Radii:** buttons `8px`, small pills `7px`, cards `12px`, feature/trail cards
  `16px`, badges/chips `99px` pill, avatars `50%`.
- **Shadows** are soft and **forest-tinted**, never neutral black: resting
  `--shadow-sm`, card hover lifts to `0 8px 32px rgba(32,39,26,.12)`.
- **Motion:** one house easing `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-expo).
  Entrances = fade + slide-up (`y:20–32→0`), staggered, triggered on scroll-into-view,
  always gated behind `prefers-reduced-motion`.
- **Signature gradients:** hero protection wash `--grad-hero`; image-missing
  fallback green safari wash `--grad-safari` (never a broken icon).

## Spacing & layout

4px base scale; generous `80px` section rhythm alternating white / sand / bush.
Container max-widths: `1280px` header/footer, `1120px` main grids, `900px` hero
copy, `640px` centered CTA. See **`tokens/spacing.css`**.

## Voice (content)

Professional, inspiring, adventurous — never salesy. Second person ("you"),
first-person plural for the company. Short imperative headlines, often paired
("Ride the Bush. Drive the Wild."). Honesty over hype; numbers only when real.
Every string ships EN + AR.

## Files in this skill

- **`reference.md`** — the full brand guide (voice, visual foundations,
  iconography, imagery, layout) — read this for depth.
- **`tokens/`** — `colors.css`, `typography.css`, `spacing.css`, `effects.css`,
  `fonts.css` — the exact token values. `styles.css` is the `@import` entry point.
- **`guidelines/`** — foundation specimen cards (`*.card.html`) for each color,
  type, spacing, and brand facet.
- **`components/`** — reference React primitives with `.jsx`, `.d.ts`, and
  `.prompt.md` per component (forms, feedback, navigation, data-display, overlay).
- **`ui_kits/website/`** — a full click-through recreation of the marketing site,
  dashboard, and admin views.
- **`manifest.json`** — machine index of every component, token, and card.
- **`assets/logo-safari-riders.png`** — the canonical wordmark.

## Applying it in this repo

Prefer the repo's own Tailwind v4 tokens (CSS custom properties in
`app/globals.css` under `@theme inline`) and the existing `components/public/*`
primitives — this skill is the spec they implement. Use the reference `.jsx`
here as a pattern guide, not as files to copy into the Next.js app verbatim
(they are standalone kit components, not wired to the repo's i18n/data layer).

# Safari Adventure Riders — Design System

> The brand + UI system for **Safari Adventure Riders**, a premium East-Africa
> adventure-travel company running guided **group motorcycle tours** and
> **private luxury safaris** across Kenya, Tanzania and East Africa.
> Based in Nairobi. Bilingual **English / Arabic (RTL)**. Books direct — no
> agency middleman.

This project is the single source of truth for the brand's colours, type,
spacing, motion, components and full-screen UI kits. It was reverse-engineered
from the live product source (see **Sources** below) so that every value here
matches production rather than a mood board.

---

## Sources

Everything in this system was lifted from real materials — copy exact values
from these when you extend the system:

- **GitHub — website & operations platform (ground truth):**
  <https://github.com/issaa-safari/safari-adventure-tour>
  Next.js 16 + React 19, Tailwind CSS 4, Radix, `lucide-react`, Framer Motion,
  Supabase. The colour palette (`app/globals.css`), font stack
  (`app/layout.tsx`), and all public components (`components/public/*`) come
  from here. **Explore this repo to build higher-fidelity Safari Adventure
  Riders designs.** Other repos on the same org
  (<https://github.com/issaa-safari>) are unrelated experiments.
- **Live site:** <https://safariadventureriders.com>
- **Logo:** `uploads/SR1.pdf.png` → copied to `assets/logo-safari-riders.png`.
- **Uploaded brief:** brand personality, audience, feature list (motorcycle &
  safari booking, custom itinerary builder, WhatsApp, EN/AR, agent portal,
  customer dashboard, gallery, blog, reviews).

> ⚠️ **Palette note.** The uploaded brief named "Forest Green #2E5E3B / Warm
> Gold #C49A3A". The **shipping product uses a richer, landscape-derived
> palette** (Olive `#7A9A4A`, Bush `#20271A`, Gold `#C9A24B`, Murram `#B0492B`,
> Sand `#EAE3D2`). **The code wins** — this system uses the production values.
> If you want the exact brief hexes instead, tell me and I'll swap them.

---

## The product at a glance

Two trails, one operator:

- **Ride the Bush** — group motorcycle tours. Accent: **Murram** (red earth,
  `#B0492B`). Fully-supported, serious-rider adventure.
- **Drive the Wild** — private luxury safaris. Accent: **Gold** (ochre,
  `#C9A24B`). Custom itineraries, exclusive camps, your group only.

**Olive** (`#7A9A4A`) is the master brand colour used for primary CTAs across
both. **Bush** (`#20271A`) is the dark, cinematic surface behind hero and CTA
sections. **Sand** (`#EAE3D2`) is the warm parchment fill for alternating
sections.

---

## CONTENT FUNDAMENTALS

**Voice:** professional, inspiring, adventurous, knowledgeable, welcoming — but
never salesy. The house style is *confident and plain-spoken*: it earns trust
by being specific and honest rather than hyping.

- **Person.** Second person ("you"), first-person plural for the company
  ("we", "our guides"). Directly addresses the traveller.
- **Headlines** are short, punchy, imperative, often paired and rhythmic:
  *"Ride the Bush. Drive the Wild."* · *"Choose Your Trail"* · *"Why book
  direct?"* Title Case for section headings; sentence case for sub-copy.
- **Body copy** is concrete and anti-fluff. It names real things: *"They know
  where the road washes out and where the leopard drinks."* · *"Fully
  supported, KTM-grade adventure for serious riders."*
- **Undercuts its own marketing** to build trust: *"Not a slogan — here's what
  booking direct with us actually means."* · credibility bar shows *"true
  claims only, no fabricated metrics"* (Based in Nairobi · Operating since 2009
  · English · Arabic · Swahili).
- **Honesty over hype.** Empty states are candid and helpful, not apologetic:
  *"No fixed dates right now — this tour is available on request. Get in touch
  to discuss your dates."*
- **Numbers** are used sparingly and only when real: *"15+ Years Local
  Knowledge"*, *"Max 10 riders / guests"*, *"Join 500+ happy travellers"*.
- **CTAs** are action-first and specific: *"Request a Quote"*, *"Plan Your
  Adventure"*, *"Explore Bike Tours"*, *"Chat on WhatsApp"*, *"Enquire About
  Dates"*, *"Book"*.
- **Bilingual.** Every string ships EN + AR. Arabic is a first-class citizen,
  not an afterthought — full RTL (`dir="rtl"`), Arabic body font, and
  localised dates/numerals. Support languages advertised: English · Arabic ·
  Swahili.
- **Emoji:** used sparingly as small trust/utility glyphs (🛡️ 🗺️ 🌍 🤝 on the
  "what makes us different" cards) and — in the current code — a 🦁 placeholder
  in the header logo mark. Not used in body copy. Prefer the real logo or
  `lucide` icons over emoji in new work.
- **Star ratings** rendered as `★★★★★` in amber.

---

## VISUAL FOUNDATIONS

**Overall vibe:** premium adventure. Big, warm, cinematic wildlife photography
under a dark forest-green wash; generous whitespace; rounded cards with soft
forest-tinted shadows; earthy, landscape-derived colour. Feels expensive and
outdoorsy at once — never corporate-slick, never clip-arty.

### Colour
- **Master brand:** Olive `#7A9A4A` (primary CTA / active), hover to Olive-dk
  `#3D5229`.
- **Dark surface:** Bush `#20271A` — hero backgrounds, CTA bands, credibility
  bar, footer-adjacent sections. Text on it is Sand at 70–85 % opacity.
- **Warm fill:** Sand `#EAE3D2` parchment for alternating light sections.
- **Trail accents:** Murram `#B0492B` (bike) and Gold `#C9A24B` (private) — used
  for card tints, booking CTAs and progress bars, never mixed on one surface.
- **Body text:** Stone `#6E6A59` on light; headings in Bush.
- **Neutrals are warm**, never cold grey: card borders `#E5E0D8`, app
  background `#F5F0E8`, app surface `#FFFCF7`.
- **Status** chips use soft tints (success green, warn amber, danger red,
  neutral grey) — see `tokens/colors.css`.

### Imagery
Large, **immersive, full-bleed wildlife & landscape photography** is the hero
of the brand — warm-toned, golden-hour, editorial (zebra, elephant, lion,
giraffe, safari vehicles, the Great Migration). Photos are always paired with a
**protection gradient** for legibility:
- Hero: `linear-gradient(to top, rgba(20,25,15,.95) → .15)`.
- Trail cards: an accent-tinted gradient `${accent}ee → ${accent}44`.
When an image is missing, it degrades gracefully to a **green safari gradient**
`linear-gradient(135deg,#2F3B22,#4C5E2A,#7A9A4A)` — never a broken icon.

### Type
Readex Pro (display / headings, bold 700, slightly tight tracking) over IBM
Plex Sans (body). Arabic in IBM Plex Sans Arabic. Headlines use fluid `clamp()`
sizes so heroes scale from mobile to desktop. Uppercase eyebrow/badge labels
get `0.1em` letter-spacing.

### Corner radii & cards
Rounded, friendly, consistent: buttons `8px`, small buttons/inline pills `7px`,
standard cards `12px`, feature/trail cards `16px`, badges & status chips `99px`
pills, avatars `50%`. A standard card is **white, `12px` radius, `1px` warm
border (`#E5E0D8`), soft shadow** — corners rounded on all sides (never a
colored left-border-only accent card).

### Shadows
Soft and **forest-tinted**, never neutral black or harsh: resting cards use a
faint `shadow-sm`; on hover they lift to `0 8px 32px rgba(32,39,26,.12)`. The
floating WhatsApp button uses a larger `shadow-float`.

### Motion
Framer Motion throughout, one signature easing: **`cubic-bezier(0.22, 1, 0.36,
1)`** (ease-out-expo). Vocabulary:
- **Entrances:** fade + slide-up (`y: 20–32 → 0`), `0.4–0.7s`, staggered by
  `~0.06–0.1s` per item, triggered on scroll-into-view (`once: true`).
- **Hero image:** slow `scale(1.05 → 1)` over `1.2s`.
- **Decorative:** the "Choose Your Trail" fork draws its SVG paths on view.
- **Always** respects `prefers-reduced-motion` (all entrance animations are
  gated behind `useReducedMotion`).
- Progress bars animate width from 0 on view.

### Hover / press states
- **Buttons:** background darkens (Olive → Olive-dk); colour transition
  `~0.4s`. Disabled = `opacity .5–.6` + `not-allowed`.
- **Cards:** translate up (`-6px` trail, `-2px` list rows) and gain the hover
  shadow.
- **Floating button:** `scale(1.05)` + deeper shadow.
- No aggressive scale-down / squish on press; keep it calm and premium.

### Borders, transparency & blur
Hairline warm borders everywhere (`1px`). Glass badges over photos use
`rgba(255,255,255,.15)` fill + `rgba(255,255,255,.3)` border +
`backdrop-filter: blur(4px)`. Focus rings are a 2px olive ring.

### Layout
Sticky white top header with bottom hairline. Content max-widths: `1280px`
header/footer, `1120px` main grids, `900px` hero copy, `640px` centered CTA.
Section rhythm is a generous `80px` vertical padding, alternating white / sand /
bush backgrounds. Fixed elements: sticky header + a floating WhatsApp FAB
bottom-right (`z-50`).

---

## ICONOGRAPHY

- **Primary set:** [`lucide-react`](https://lucide.dev) (the app dependency).
  Thin, rounded, consistent **1.5px stroke** line icons. In HTML mocks, load
  Lucide from CDN — see any component card for the pattern — rather than
  hand-drawing SVG.
- **Bespoke inline SVGs** appear in a few marketing spots (the "Why book
  direct?" check / compass / chat glyphs) drawn at **1.5–1.8px olive stroke**,
  `round` caps & joins — matching Lucide's weight. Reuse that style if you must
  draw one.
- **WhatsApp** uses its official brand glyph on brand green `#25D366` — never
  restyled (it's a conversion-critical, recognisable mark).
- **Emoji** are used only as small trust glyphs on feature cards (🛡️🗺️🌍🤝) and
  as a temporary 🦁 logo placeholder in the current header. Prefer the real
  logo mark and Lucide icons in new work.
- **Logo:** `assets/logo-safari-riders.png` — a rugged, distressed-stencil
  "SAFARI RIDERS" wordmark with a motocross helmet over an olive brush-stroke
  map of Africa. Note the live site currently renders a 🦁 emoji placeholder
  instead; treat the PNG as the canonical mark.
- No icon **font** is used; icons are SVG (Lucide) or inline SVG.

---

## Foundations, tokens & fonts

- **`styles.css`** (root) — the entry point consumers link. `@import` list only.
- **`tokens/colors.css`** — base palette, warm neutrals, status, semantic
  aliases (`--brand-primary`, `--accent-bike`, `--accent-private`,
  `--surface-*`, `--text-*`).
- **`tokens/typography.css`** — families, weights, fluid + static scale, line
  heights, letter-spacing.
- **`tokens/spacing.css`** — spacing scale, section rhythm, container widths.
- **`tokens/effects.css`** — radii, shadows, borders, signature gradients,
  motion (easing / durations / lifts).
- **`tokens/fonts.css`** — Google Fonts import (Readex Pro, IBM Plex Sans, IBM
  Plex Sans Arabic, Geist Mono). All four are Google Fonts — **no substitution
  needed**, they match production exactly.

---

## Components

- **Forms** — `Button`, `Field` (+ `TextareaField`, `SelectField`), `Toggle`, `Checkbox`, `Radio`
- **Feedback** — `Alert`, `StatusBadge`, `TrailBadge`, `Eyebrow`, `Toast`
- **Navigation** — `LanguageToggle`, `NavLink`, `Tabs`
- **Data display** — `Card`, `FeatureCard`, `Avatar`, `StaffPill`, `ProgressBar`, `Tooltip`
- **Overlay** — `Dialog`

## Index / manifest

- `styles.css` — global entry point
- `tokens/` — colors, typography, spacing, effects, fonts
- `assets/` — logo + brand imagery
- `guidelines/` — foundation specimen cards (Design System tab)
- `components/` — reusable React UI primitives (see Components above)
- `ui_kits/website/` — full click-through recreation of the marketing site + admin/dashboard views
- `SKILL.md` — Agent-Skill entry point

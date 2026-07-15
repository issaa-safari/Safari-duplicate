# Tour Detail Page — Design & Build Brief

**Page:** Public tour detail page (e.g. `/tours/[slug]` and the departure detail it links to)
**Goal:** Turn a high-intent visitor into an enquiry or a booking. This is the single
highest-leverage public page — design budget goes here first.
**Stack:** Next.js 14 App Router · Supabase · Tailwind · TypeScript · Vercel
**Tools:** 21st.dev Magic (`/ui`) for components, Framer Motion for animation.
**Reference for flow/feel:** rideexpeditions.com (booking flow and energy — not a visual copy).

This page serves **two product lines** from one template, switched by `trip_type`:
- **Motorbike** — 8-day KTM 390 group departures, ~1000km loop. Rugged, kinetic energy.
- **Private safari** — 7-day luxury, from $9,000/adult. Refined, spacious, golden.

---

## 1. Token system (derive every colour and type decision from this)

### Palette — a Kenyan-landscape palette, not the cream/serif/terracotta AI default
- `--sand` **#EAE3D2** — savanna background (warmer and earthier than generic cream)
- `--olive` **#7A9A4A** — brand primary (existing brand colour — keep exact)
- `--bush` **#20271A** — deep bush green-black, for ink and dark sections
- `--murram` **#B0492B** — red-earth road accent. **Motorbike** trips lead with this.
- `--gold` **#C9A24B** — golden-hour light accent. **Safari** trips lead with this.
- `--stone` **#6E6A59** — muted captions, borders, secondary text

`trip_type` selects the accent token: motorbike → `--murram` (grittier, higher contrast);
safari → `--gold` (calmer, more white space). Everything else stays shared.

### Type — must work in EN and AR, so pick faces that cover both scripts
- **Display:** `Readex Pro` — one family covering Latin **and** Arabic, geometric-humanist
  with real character. Using a single cross-script family keeps EN and AR visually
  cohesive (a deliberate choice for a bilingual brand, not a default).
  *Optional EN-only upgrade:* `Fraunces` for English display if you want more editorial
  punch — but then pair a strong Arabic display (e.g. `Tajawal` bold) and accept the
  two-family tradeoff.
- **Body:** `IBM Plex Sans` + `IBM Plex Sans Arabic` — excellent readability, professional,
  matched Latin/Arabic metrics.
- Set an intentional scale (e.g. display 3.5–5rem hero, generous line-height on body).
  Verify Arabic renders at the same optical weight — Arabic often needs slightly more
  line-height and size to match Latin presence.

### Signature element (the one thing this page is remembered by)
A **route line**: a hand-drawn-feeling topographic/GPS contour that threads down the
itinerary, with each day a numbered node on the route. It encodes real information — the
trip *is* a sequence and a real route (Nairobi loop / Nairobi→Mara→Nairobi), so numbered
day markers and a drawn path are honest structure, not decoration. This is where the
boldness is spent; keep everything else quiet.

---

## 2. Section order (top to bottom)

1. **Hero** — full-bleed real photo (use existing `SafariImage`), tour title (EN/AR),
   one-line positioning, a row of fact chips (days · distance + offroad% for moto, or
   "Private · luxury" for safari), `From $X` and a primary CTA. Subtle parallax / slow
   scale on the image.
2. **Sticky enquiry bar** — appears once the hero scrolls out: `From $X` + "Request a quote"
   / "Check dates" + WhatsApp. Mobile-first; always reachable.
3. **Overview** — one evocative paragraph + a quick-facts grid (difficulty, terrain,
   group size, start/end point, bike model OR accommodation tier).
4. **Route map / signature** — the route-line motif (section 1, Signature).
5. **Day-by-day itinerary** — numbered days as stops; each shows destination, activities,
   accommodation, meals (from `tour_days`). Scroll-reveal stagger; route path draws in.
6. **What's included / not included** — two clear columns.
7. **Gallery** — masonry from `gallery_urls` (SafariImage, stock fallback).
8. **Departures & availability** — driven by `booking_mode`:
   - fixed departure (moto): real seats-left (`max_seats − booked_seats`), status badges
     ("5 seats left", "Guaranteed", "Fully booked"), per-departure book/enquire.
   - on-request / private (safari): an "Enquire about your dates" block instead.
9. **Trust strip** — guides from `tour_staff` (photo, name, bio), safety/vehicle standards,
   "what makes us different".
10. **Reviews** — testimonials.
11. **Final CTA / enquiry form** — required "Where did you hear about us?" source dropdown,
    group-size selector. Submitting creates a request with `source='website'`, linking the
    tour (and departure if chosen) into the existing pipeline.

---

## 3. Motion brief (Framer Motion) — orchestrated, not scattered

- **Hero load:** one sequenced moment — image eases in with a slow scale, then title,
  subtitle, chips, CTA rise and fade in a short stagger. This is the page's signature
  motion beat.
- **Section reveals:** `whileInView`, `once: true`, small upward offset + fade. Quiet.
- **Itinerary:** day nodes stagger in on scroll; the route line animates via `pathLength`
  as the section enters — the one elaborate moment.
- **Cards (departures, gallery):** subtle hover lift/scale only.
- **Sticky bar:** slides up/in after the hero leaves the viewport.
- **Restraint:** if a motion doesn't serve comprehension or the adventure feel, cut it —
  over-animation is what makes a page read as AI-generated.
- **Reduced motion:** respect `prefers-reduced-motion` everywhere (no parallax, no path
  draw, instant reveals).

---

## 4. Hard technical rules (do not violate)

- **Server-first.** Keep all data fetching in server components. Make **only** the animated
  pieces client components (`"use client"`) and pass data in as props. Do not convert the
  whole page to a client component.
- **Public data access.** Read with the normal Supabase client + public-read RLS on active
  rows. **Never** use `createAdminClient` / service role on a public page. This is inverted
  from the admin convention and is a critical security boundary.
- **Imagery.** Use the existing `SafariImage` component for every image (real DB image →
  stock fallback → graceful degrade). Real column is `hero_image_url` / `gallery_urls`.
- **Bilingual + RTL.** Read `*_en` / `*_ar` fields. Set `dir="rtl"` for Arabic and **mirror
  every x-axis animation** (slide-in from the right in AR). Verify the whole layout flips,
  not just text.
- **Tailwind / Turbopack.** Confirm Tailwind major version first; match Magic's output to it.
  Use inline `style={{ ... }}` for any *dynamic* values (e.g. computed grid columns, progress
  widths) — Turbopack purges arbitrary Tailwind classes.
- **Types.** TypeScript throughout; introduce no new `any`. Reuse existing domain types.
- **Don't break the data layer.** Keep existing props/query shapes for `tour`, `tour_days`,
  `departures`, `hero_image_url`, `gallery_urls`. Redesign presentation, not data.
- **Accessibility floor:** responsive mobile-first, visible keyboard focus, reduced motion.

### Out of scope — do not touch
Admin CRM, DB schema/migrations, `.env`, payment logic, or any route's data layer beyond
this page. Work on a branch; commit before starting.

---

## 5. Paste this into Claude Code

> Redesign the public tour detail page (and the departure detail it links to) following the
> brief in `docs/tour-page-redesign-brief.md`. Work on a new branch and commit first.
>
> Use the route-line signature, the section order, and the Kenyan-landscape palette in the
> brief (brand olive #7A9A4A primary; murram red #B0492B accent for `trip_type='motorbike'`,
> gold #C9A24B for safari). Type: Readex Pro for display, IBM Plex Sans / IBM Plex Sans Arabic
> for body — both must render in Arabic.
>
> Use `/ui` (21st.dev Magic) to generate the hero, itinerary day cards, departure cards,
> gallery, trust strip, and enquiry form, then adapt them to the brief. Animate with Framer
> Motion per the motion brief (orchestrated hero load, scroll reveals, itinerary route-line
> pathLength draw, subtle card hovers, sticky enquiry bar). Respect prefers-reduced-motion.
>
> Hard rules: server components fetch data and pass props; only animated pieces are
> `"use client"`. Public reads use the normal Supabase client + public-read RLS — never
> createAdminClient. Use the existing SafariImage component (hero_image_url / gallery_urls).
> Full RTL support with mirrored animations for Arabic. Inline styles for dynamic values
> (Turbopack purges arbitrary Tailwind classes). No new `any`. Don't change schema, routes,
> the data layer, or admin.
>
> Before writing code, show me your component list and a short plan for the hero + itinerary
> route-line, and tell me my current Tailwind major version so we match Magic's output.

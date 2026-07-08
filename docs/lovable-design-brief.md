# Design Brief — Visual & UX Polish Pass (for Lovable)

## What this app is
**safari-duplicate**: an admin/ops platform for a Kenya/Tanzania safari tour operator (*Safari Adventure Riders*), plus a small public marketing site and a client-facing quote proposal page. Stack: Next.js (App Router) + Supabase (Postgres + Auth), deployed on Vercel.

## Goal of this pass
Make the app **more beautiful and easier to use** — visual polish, layout/spacing consistency, clearer hierarchy, better empty states and micro-interactions, improved mobile behavior. This is a **presentation-layer pass**, not a rebuild.

## Existing brand (keep/extend, don't replace)
- **Font:** IBM Plex Sans (body), var `--font-body`.
- **Palette** (`app/globals.css`):
  - `--olive: #7A9A4A` — primary brand / CTA / active
  - `--olive-dk: #3D5229` — hover/pressed/dark text on olive tints
  - `--olive-lt: #C5D9B0` — light olive borders/tints
  - `--bush: #20271A` — deep forest, dark surfaces
  - `--sand: #EAE3D2` — parchment cream, section fills
  - `--gold: #C9A24B` — ochre, private-safari accent
  - `--murram: #B0492B` — red earth, bike-tour accent
  - `--stone: #6E6A59` — warm grey, secondary text
  - Admin surface tokens: `--admin-bg #F5F0E8`, `--admin-surface #FFFCF7`, `--admin-border #E0D4C3`, `--admin-text #2C1A0E`, `--admin-text-muted #7A6652`
- Warm, earthy "safari" feel — not a generic SaaS blue/purple palette.

## Priority areas (highest leverage first)
1. **Public client-facing proposal** (`app/quote/[token]/page.tsx` + `print/page.tsx`) — this is what clients actually see before deciding to book. It just gained per-day photo galleries; needs a genuinely image-led, premium feel (hero, day cards, pricing summary) in both **English and Arabic (RTL)** — RTL must keep working.
2. **Quote detail / itinerary builder** (`app/admin/quotes/[id]/*`) — the day-by-day editor is dense (a 6-column grid per day row); look for ways to make it feel less like a spreadsheet without losing information density. A 4-step progress header (Itinerary → Pricing → Preview → Send) was just added — refine its visual treatment.
3. **Dashboard & Analytics** (`app/admin/dashboard`, `app/admin/analytics`) — KPI cards, charts, empty/zero states.
4. **Requests pipeline & Trip Builder** (`app/admin/requests`, `app/admin/trip-builder`) — the daily-driver screens for the consultant.
5. General: empty states, loading states, form validation feedback, button/badge consistency across the whole admin.

## Hard constraints — do not touch
- **No changes to `migrations/`, Supabase schema, RPC functions, or `lib/server/*` business logic.**
- **No changes to server actions' data-handling logic** (files like `actions.ts`, `route.ts`) beyond what's needed to wire up a new UI (e.g. don't remove validation, don't change what gets written to the DB).
- **Keep bilingual EN/AR + RTL support intact** everywhere it exists today.
- **Keep the mobile "stack" pattern** (`.stack-table` / `.stack-grid` in `app/globals.css`) — wide tables/grids already collapse to labeled cards below 640px; preserve or improve this, don't regress to horizontal scroll.
- Don't rename routes or change the information architecture without flagging it — this app has real, imperfect users and muscle memory.

## How to work
- Connect Lovable to this GitHub repo on the **`lovable-design-pass`** branch (not `main`) — this branch is a clean checkout of the current `main` after the P0 bug-fix/feature work merged, dedicated to this visual pass. Let it iterate here.
- Prefer small, reviewable commits over one giant rewrite.
- When ready to ship, open a PR from `lovable-design-pass` into `main` so it can be reviewed (typecheck/tests/build run in CI) before going live.

## Reference material already in this repo
- `01-information-architecture.md` … `11-tech-stack.md` + `IMPLEMENTATION-BLUEPRINT.md` — a competitor (SafariOffice) analysis; useful for **inspiration on structure/flows**, not for copying their visuals/branding (see the legal note in `IMPLEMENTATION-BLUEPRINT.md`).
- `GAP-ANALYSIS.md` — calls out itinerary/proposal richness as the single highest-leverage visual gap.

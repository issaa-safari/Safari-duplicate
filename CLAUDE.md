# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An admin/ops + public marketing platform for a Kenya/Tanzania safari tour operator (*Safari Adventure Riders*). The core operator workflow is: inbound **Request** → build day-by-day **Quote** (versions, pricing) → publish a shareable public **Proposal** → client **Accepts** → **Booking**. Supporting modules: content library (accommodations, activities, destinations, parks, vehicles, staff, rates), clients CRM, finance (payables/receivables/expenses/P&L), departures (fixed public trips), and daily request automation.

Project docs: `docs/` holds feature plans and audits; `DESIGN.md` and `PRODUCT.md` are the design-system and product-register context used by the impeccable design skill — keep them in sync when the visual language or audience framing changes.

## Commands

```bash
npm run dev          # Next.js dev server (Turbopack)
npm run build        # production build
npm run lint         # eslint (next core-web-vitals + typescript)
npm test             # vitest run (all *.test.ts, node env)
npm run test:watch   # vitest watch
npx tsc --noEmit     # type check (CI runs this separately)
```

Run a single test: `npx vitest run lib/pricing.test.ts` or filter by name with `npx vitest run -t "markup"`.

CI (`.github/workflows/ci.yml`) runs, in order: `tsc --noEmit`, `npm test`, `npm run build` on Node 22. Match all three locally before pushing.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19**, TypeScript strict.
- **Supabase** (Postgres + Auth + Storage) via `@supabase/ssr`. Project ref `oejlkzcoynijqtokbizz`.
- **Tailwind CSS v4** (`@tailwindcss/postcss`), shadcn-style primitives in `components/ui`, `lucide-react` icons, `framer-motion`.
- Deployed on **Vercel** (`vercel.json`); a daily cron hits `/api/cron/daily-automation`.
- Path alias `@/*` → repo root.

## Architecture

### Two apps under one Next.js project
- `app/(public)/…` and top-level public pages — marketing site + client-facing proposal (`app/quote/[token]`), departures booking, login/register.
- `app/admin/…` — the operator back office (requests, quotes, trip-builder, content, finance, bookings, clients, settings).

### Auth & route protection
- **`proxy.ts`** at the repo root is the Next.js middleware (Next 16 renamed `middleware.ts` → `proxy.ts`; `matcher: ['/admin/:path*']`). It calls `updateSession` in `lib/supabase/middleware.ts`, which refreshes the Supabase session **and** gates `/admin/*`: a logged-in user is an admin only if their email exists in the `admin_users` table (checked with the service-role client). Non-admins are redirected to `/admin/login?error=unauthorized`.
- Server code re-checks admin access with `assertAdminAccess`/`getAdminProfile` in `lib/auth/admin-access.ts` — don't rely on middleware alone in actions/routes.

### Supabase client selection (important)
Three factories in `lib/supabase/` — pick deliberately:
- `server.ts` `createClient()` — cookie-bound SSR client, **respects RLS**, acts as the logged-in user. Use in user-facing reads.
- `admin.ts` `createAdminClient()` — **service-role, bypasses RLS**. Use for admin writes and privileged reads. Never import into client components or expose its key.
- `client.ts` — browser client for client components.
- `config.ts` — the Supabase URL and publishable (anon) key have hardcoded fallbacks because they ship to the browser anyway; env vars override. The **service-role key has no fallback** and is env-only (`SUPABASE_SERVICE_ROLE_KEY`).

### Server actions & the result envelope
Mutations are Next.js **server actions** colocated as `actions.ts` next to their route (e.g. `app/admin/content/accommodations/[id]/actions.ts`). Next.js masks thrown `Error` messages in production, so actions that need the UI to show a real message **return** `{ error: string }` instead of throwing. Wrap action bodies in `safeAction` from `lib/server/action-result.ts`: it converts thrown errors to `{ error }` while rethrowing Next's own redirect/notFound control-flow errors (`isNextControlFlowError`). Return `ActionResult<T>`.

### Domain logic lives in pure, tested libs
Business rules are extracted into side-effect-free functions in `lib/` with colocated `*.test.ts`, so they're unit-testable without a database:
- `lib/pricing.ts` — quote line cost/markup math (`calculateLineTotals`).
- `lib/rate-resolution.ts` — season-aware supplier rate lookup by **service date** (check-in night / hire day / park-entry date), never "today". A missing rate throws `RateGapError` — a rate gap must surface as a blocking warning, never be silently priced as 0.
- `lib/automation.ts` — predicates behind the daily cron (`shouldComplete`/`shouldArchive`/`shouldDelete`).
- `lib/server/quote-status.ts` — `syncQuoteStatus`: `quotes.status` and `quote_versions.status` are separate columns that drift. Call `syncQuoteStatus` after **any** `quote_versions.status` write so the parent reflects the most-advanced version (ranked by `STATUS_RANK`).

### Quotes are versioned
A quote has many `quote_versions`; the trip-builder (`app/admin/trip-builder/…` and `app/admin/quotes/[id]/versions/[versionId]/…`) edits a version's day-by-day itinerary and pricing. Status flows `draft → ready → sent → viewed → accepted/declined/expired/cancelled` (`QuoteStatus` in `lib/types.ts`). The public proposal renders a version by share token at `app/quote/[token]`, with a print view at `app/quote/[token]/print`.

### API routes
`app/api/…` route handlers cover public endpoints (tours, departures, quote-request, quote accept/decline) and admin-only helpers (`/api/admin/*` for search, itinerary save, uploads, lookups, stage updates). Integrations: `/api/webhooks/whatsapp` (lead capture; rejects POSTs with 401 until `WHATSAPP_APP_SECRET` is set) and `/api/cron/daily-automation` (Vercel cron).

## Database & migrations

- **`migrations/` is the source of truth for the schema** — ordered `group_NN_*.sql` (schema, additive) and `seed_NN_*.sql` (sample/test data). Apply in numeric order.
- `lib/types.ts` is **hand-authored from the migrations**, not generated. When you change the schema, update the relevant types by hand (or regenerate with `supabase gen types typescript` if live access exists).
- Prefer **additive** migrations; RLS is enabled on exposed tables (see `group_31`, `group_34`, `group_43`). New migrations go in the next `group_NN` file.

## Local backend without live Supabase

`scripts/dev-backend.mjs` emulates the slice of the Supabase HTTP API this app uses (PostgREST + GoTrue auth + storage), backed by a local Postgres loaded with `./migrations`. Point the app at it via `.env.local` (`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, dev keys). Any email/password logs in as the first `admin_users` row. See the header comment in the script for the full setup.

## Conventions

- **Env vars**: copy `.env.example`. Supabase vars are required; Resend email (`RESEND_API_KEY`) is optional and **silently no-ops when unset** (`lib/email.ts` never throws — a broken email provider must not fail a booking). WhatsApp webhook needs `WHATSAPP_APP_SECRET`.
- **Bilingual EN/AR (RTL)**: proposal and itinerary surfaces support English + Arabic. Keep both intact when editing customer-facing UI (`lib/i18n.ts`, `lib/use-locale.ts`, `*_ar` columns).
- **Security headers / CSP** are set in `next.config.ts` (`connect-src` allows only `self` + Supabase). If you add an external API called from the browser, update the CSP there.
- **Component layout**: `components/ui` (generic primitives), `components/admin` + `components/admin/ui` (back-office), `components/public` (marketing), `components/quote` (proposal). Route-specific `form.tsx`/`*-panel.tsx` files live next to their page.
- **Testing throwaway data**: when driving the app end-to-end, use disposable records (the prior convention was naming them `ZZ-QA-TEST-DELETE`) and clean them up; don't touch real client data.

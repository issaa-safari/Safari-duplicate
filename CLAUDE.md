# CLAUDE.md

## What this is
Safari Adventure Riders — single-tenant booking/CRM/quoting platform for a Kenya–Tanzania
safari & motorbike-tour operator. Public site + client portal (`app/(public)/`, `app/quote/[token]/`)
and admin back office (`app/admin/`) in one Next.js app. Bilingual EN/AR (RTL).

## Stack (do not trust any doc that says otherwise)
- Next.js **16** App Router, React 19, TypeScript strict. Middleware lives in **`proxy.ts`** (Next 16 name).
- Tailwind **v4**: no `tailwind.config`; tokens are CSS custom properties in `app/globals.css` (`@theme inline`).
- **Supabase** (Postgres + Auth via `@supabase/ssr`). **No ORM** — raw SQL migrations, hand-written types in `lib/types.ts`.
- Auth: cookie sessions; `proxy.ts` gates `/admin/:path*` only; admin authorization = row in `admin_users`
  (checked in `lib/supabase/middleware.ts` and again in `app/admin/layout.tsx`).
- One Vercel cron: `/api/cron/daily-automation` (02:00 daily, see `vercel.json`).

## Authoritative sources (in order)
1. `migrations/` — **the schema source of truth.** Ordered `group_NN_*.sql`; append a new group_NN,
   never edit an applied migration. (`group_28` is intentionally absent from the sequence.)
2. `DESIGN.md` — design system: olive `#7A9A4A` palette, Readex Pro + IBM Plex Sans (public),
   Inter + Playfair scoped under `.admin-theme` (admin).
3. `PRODUCT.md` — brand/product positioning.
4. `docs/current/` — canonical specs for the app as built.

## docs/reference/ and docs/archive/ — read with care
- `docs/reference/safarioffice/` is a competitor analysis of **SafariOffice** (another product).
  It is accurate about SafariOffice and useful for feature mining, but **nothing in it describes
  this repo** — its routes, PHP field names, green `#16b408` palette, and NestJS/Prisma stack
  recommendations are not ours.
- `docs/archive/` holds superseded plans and specs for a **rebuild that was never built**
  (NestJS, Prisma, Turborepo, multi-tenant `company_id` — none of it exists here).
  Never treat anything in `docs/archive/` as a claim about the current code.

## Commands
- `npm run dev` / `npm run build` / `npm run lint` / `npm run test` (vitest run) / `npm run test:watch`
- Offline backend emulating Supabase from `./migrations`: `node scripts/dev-backend.mjs`
- Screenshot all screens: `node scripts/inspect-screens.mjs <outdir>` · contrast check: `node scripts/check-contrast.mjs`

## Workflow
- Branch off `main`, open a PR to `main`, merge via GitHub. Never commit directly to `main`.
- Schema changes = new `migrations/group_NN_*.sql` + matching update to `lib/types.ts`.
- Run `npm run lint && npm run test` before pushing.

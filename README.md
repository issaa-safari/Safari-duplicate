# Safari Adventure Riders

Booking, CRM, and quoting platform for a Kenya–Tanzania safari & motorbike-tour
operator. A single Next.js app serves both the public marketing site + client
portal and the admin back office. Bilingual EN/AR (with RTL).

## Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript** (strict).
- **Tailwind v4** — no `tailwind.config`; design tokens are CSS custom properties
  in `app/globals.css` (`@theme inline`).
- **Supabase** (Postgres + Auth via `@supabase/ssr`). No ORM — raw SQL migrations
  under `migrations/`, hand-written types in `lib/types.ts`.
- Edge middleware lives in **`proxy.ts`** (Next 16's middleware filename). It gates
  `/admin/:path*`; admin authorization is `admin_users` membership.
- One Vercel cron: `/api/cron/daily-automation` (see `vercel.json`).

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run start        # serve the production build
npm run lint         # eslint (flat config)
npm run test         # vitest run
npm run test:watch   # vitest watch

node scripts/dev-backend.mjs        # offline Supabase emulator from ./migrations
node scripts/inspect-screens.mjs <outdir>   # screenshot every screen
node scripts/check-contrast.mjs             # contrast audit
```

## Documentation map

- **`CLAUDE.md`** — orientation for agents/contributors; the source-of-truth pointers.
- **`DESIGN.md`** — design system (olive `#7A9A4A`, fonts, admin vs. public themes).
- **`PRODUCT.md`** — brand and product positioning.
- **`docs/current/`** — canonical specs for the app as it is actually built.
- **`docs/reference/safarioffice/`** — competitor analysis of *SafariOffice* (a
  different product). Accurate about SafariOffice and useful for feature mining;
  **nothing in it describes this repo.**
- **`docs/archive/`** — superseded plans and specs, including a rebuild
  (NestJS/Prisma/Turborepo) that was **never built**. Not a description of the
  current code.

New to the codebase? Read `CLAUDE.md` first, then `docs/current/`.

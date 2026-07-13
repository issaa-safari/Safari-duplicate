# Safari Adventure Riders — operations platform

A Next.js 16 + Supabase platform for a Kenya/Tanzania safari tour operator, combining:

- **Public site** (`app/(public)/`, `app/quote/[token]/`) — bilingual EN/AR (full RTL) marketing site, tours & departures, quote requests, and client-facing trip proposals.
- **Admin back office** (`app/admin/`) — the operator pipeline: Requests → versioned Quotes (day-by-day trip builder with supplier-rate pricing) → shareable Proposals → Bookings, plus content library, clients CRM, finance, and daily automation.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys
npm run dev
```

- `npm test` — unit tests (Vitest) · `npm run lint` — ESLint · `npx tsc --noEmit` — type check
- Database schema lives in `migrations/` (apply `group_NN_*.sql` in order; `seed_*.sql` for sample data).
- No live Supabase? `scripts/dev-backend.mjs` emulates the Supabase API against a local Postgres.

See **[CLAUDE.md](CLAUDE.md)** for architecture, conventions, and development workflows, and `docs/` for feature plans and audits.

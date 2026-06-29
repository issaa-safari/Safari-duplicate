# Safari Adventure Riders

The website and operations platform for **Safari Adventure Riders** — an East
Africa safari company. It powers the public marketing site (tours, departures,
quote requests, bilingual EN/AR with RTL) and the internal admin used to build
itineraries, manage departures, send quotes, and take bookings.

Live site: <https://safariadventureriders.com>

## Tech stack

- **Next.js 16** (App Router, React Server Components)
- **Supabase** — Postgres, Auth, Storage (service-role used server-side)
- **Tailwind CSS**
- **Resend / WhatsApp Cloud API** — notifications & messaging
- Deployed on **Vercel** (production tracks the `main` branch)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

See [`.env.example`](./.env.example) for the required environment variables
(Supabase URL + keys, WhatsApp credentials).

### Useful scripts

```bash
npm run dev     # local dev server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## Project structure

```
app/
  page.tsx              Public homepage
  (public)/             Public site — tours, departures, gallery, about,
                        contact, quote-request, dashboard (signed-in clients)
  admin/                Internal admin — tours, departures, quotes, content
  api/                  Route handlers (departures, tours, quote-request,
                        bookings, WhatsApp webhook, admin endpoints…)
  quote/[token]/        Shareable client-facing quote link + print/PDF view
components/
  public/               Public UI (header, footer, cards, WhatsApp button…)
  admin/                Admin UI (itinerary builders, modals, content tools)
lib/
  supabase/             Browser, server and admin (service-role) clients
  site.ts               Central business/contact configuration
  i18n / use-locale     Bilingual (EN/AR) helpers
migrations/             SQL migration groups (run in the Supabase SQL editor)
```

## Database & migrations

Schema changes live in [`migrations/`](./migrations) as numbered `group_*.sql`
files. Apply them in order in the **Supabase SQL editor**. They are written to
be idempotent (`add column if not exists`, etc.).

## Internationalisation

The site is fully bilingual (English / Arabic). Language is resolved from the
`?lang=` URL parameter first, then a `locale` cookie, then auto-detection
(browser language / timezone). Arabic renders right-to-left (`dir="rtl"`).

## Admin access

The admin area lives under `/admin` and is gated by Supabase Auth plus an
allow-list check (`lib/auth/admin-access`). Sign in at `/login` with an
authorised account to reach the dashboard.

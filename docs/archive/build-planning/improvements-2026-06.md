# Improvements & Fixes — June 2026

A record of the work delivered in this round on the Safari Adventure Riders
platform. Everything below is committed to `main` and deployed via Vercel to
**safariadventureriders.com**.

---

## ⚠️ Action required

1. **Run migration `migrations/group_27_booking_client_link.sql`** in the Supabase
   SQL editor. It links bookings to clients and enables accepted quotes to become
   bookings. Without it, those two features fall back to the older behaviour.
2. **Confirm earlier migrations are applied** (run any that aren't, in order):
   `group_22`, `group_23`, `group_24`, `group_25`, `group_26`. Activities were
   seeded via the admin endpoint, not `seed_04_activities.sql`.
3. **Delete the stale branch** `claude/deploy-g38wo3` from GitHub's branches page.
   (The sandbox's git proxy refuses branch deletes, so it can't be done from here.)

---

## 1. Inline content with English + Arabic descriptions

While building any itinerary you can now add a new **Destination, Activity, or
Accommodation** on the spot — and give it an **English and Arabic description** in
the same dialog. New items are saved to the shared **Content library** (marked
active) and immediately available in every builder. Descriptions flow through to
the client-facing quote link and PDF by language.

**Key files:** `components/admin/create-lookup-dialog.tsx`,
`components/admin/activities-modal.tsx`,
`app/admin/tours/[id]/days/itinerary-builder.tsx`,
`app/admin/quotes/[id]/versions/[versionId]/quote-itinerary-builder.tsx`,
`app/api/admin/create-lookup/route.ts`, `lib/create-lookup.ts`.

---

## 2. Public website audit — 20 items

| # | Item | Status |
|---|------|--------|
| 1 | Real hero photography on every page | ✅ Done |
| 2 | Tour/departure cards show real photos (`hero_image_url`) | ✅ Done |
| 3 | Real contact info (no placeholders) | ✅ Done |
| 4 | Remove public `/test` page | ✅ Done |
| 5 | Featured Departures on homepage | ✅ Done (was a dead duplicate homepage) |
| 6 | Fix language detection flash / redirect loop | ✅ Done |
| 7 | Quote form tour types loaded from DB | ✅ Done |
| 8 | Testimonials / social proof | ✅ Done |
| 9 | SEO metadata + OpenGraph | ✅ Done |
| 10 | Gallery page | ✅ Done |
| 11 | Floating WhatsApp button | ✅ Done |
| 12 | Departure detail itinerary preview | ✅ Done (collapsible) |
| 13 | Client booking status tracking | ✅ Done |
| 14 | Admin analytics | ✅ Done (added bookings + top tours) |
| 15 | Replace `any` with DB types | 🟡 Partial (foundation; needs type generation) |
| 16 | `.env.example` | ✅ Done |
| 17 | Real README | ✅ Done |
| 18 | Delete stale branches | 🔴 Blocked (git proxy denies branch delete) |
| 19 | Dynamic copyright year | ✅ Done |
| 20 | `next/image` for performance | ✅ Done |

### Photography (#1, #2, #20)
- New `SafariImage` component renders a tour's real `hero_image_url` /
  `gallery_urls` from the database; when none exists it shows a curated, stable
  stock safari photo, and degrades gracefully to a green gradient if an image
  fails to load (no broken-image icons). Uses `next/image` (WebP, lazy-loading).
- **Important:** the real database column is **`hero_image_url`** (plus
  `gallery_urls`), not `cover_image_url` — the audit had the column name wrong.
- **Files:** `components/public/safari-image.tsx`, `lib/stock-images.ts`,
  `next.config.ts` (allowed Unsplash + Supabase image hosts), tour/departure
  list pages, `components/public/featured-departures.tsx`, `app/api/departures`.

### Contact, branding, year (#3, #19)
- All contact details centralised in `lib/site.ts`
  (`info@safariadventureriders.com`, `+254 710 789 789`) and used by the footer
  and contact page. Copyright year is now dynamic.

### Conversion content (#8, #11, #10)
- `components/public/testimonials.tsx` — bilingual reviews on the homepage and
  About page.
- `components/public/whatsapp-button.tsx` — floating chat button (Arabic greeting
  in AR) on all public pages.
- `app/(public)/gallery/page.tsx` — pulls tour imagery (stock fallback); linked
  from header + footer.

### SEO (#9)
- Full title template, description, keywords, OpenGraph + Twitter cards in
  `app/layout.tsx`.

### Quote form, language, cleanup (#7, #6, #4, #5, #16, #17)
- `/api/tours` feeds the quote-request "Tour Type" dropdown from real active tours.
- Header language detection is **cookie-first** (no more `setTimeout` redirect,
  so no flash or loop).
- Removed the public `/test` page and a **dead duplicate homepage**
  (`app/(public)/page.tsx`) that shadowed the live `app/page.tsx`; only one route
  serves `/` now.
- Added `.env.example` and a real project `README.md`.

---

## 3. Conversion & admin enhancements (#12–#14)

- **Collapsible itinerary** on the departure detail page (native
  `<details>`/`<summary>`, first day open) — `app/(public)/departures/[id]/page.tsx`.
- **Client booking tracking** — departure countdown, status timeline
  (Booked → Confirmed → Completed), payment progress bar with history (from
  `booking_payments`), and a **Download confirmation (PDF)** button.
  Files: `app/(public)/dashboard/bookings/[id]/page.tsx`,
  `components/public/print-button.tsx`.
- **Analytics** — added a Website Bookings summary (count / revenue / travellers)
  and a Top Tours by booking revenue ranking, alongside the existing quote
  metrics — `app/admin/analytics/page.tsx`.

---

## 4. Typed `any` foundation (#15)

- New `lib/types.ts` with hand-authored domain types (search results, lookups,
  bookings, travellers, payments, status enums) derived from the SQL migrations.
- The admin global search is typed end-to-end (`app/admin/sidebar.tsx`,
  `app/api/admin/search/route.ts`); booking travellers typed.
- **Not finished:** the remaining `any`s live in jsonb-heavy quote rendering and
  are best converted against generated types. The Supabase generator can't reach
  the schema from this environment (no DB credentials). Recommended follow-up:
  `supabase gen types typescript --project-id <ref> > lib/database.types.ts`,
  then point the clients at it.

---

## 5. Client ↔ quotes / tours / bookings wiring

The client profile read columns that don't exist, so quotes showed no tour name
and **$0**, and the bookings query failed entirely.

- **Quotes** now join `tours` (real tour name) and `quote_versions`
  (`total_selling_usd` from the accepted/latest version), show `quote_number`, and
  each row links to the quote.
- **Bookings** are matched to the client (see §6) and resolve the tour via the
  departure or the originating quote.
- **File:** `app/admin/clients/[id]/page.tsx`.

---

## 6. Bookings ↔ clients + accepted quotes become bookings

**Migration `group_27`:** adds `bookings.client_id` and `bookings.quote_id`, makes
`departure_id` nullable (so accepted **custom** quotes can also become bookings),
and backfills `client_id` by matching traveller email.

- **Website bookings** now find-or-create a CRM client by the lead traveller's
  email, set `bookings.client_id`, and refresh that client's booking totals —
  `app/api/departures/[id]/book/route.ts`, `lib/server/clients.ts`.
- **Accepted quotes → confirmed bookings:** when a client accepts a quote, the
  system creates a **confirmed** booking (one per quote, idempotent), records a
  pending finance entry, reserves seats if there's a departure, and refreshes the
  client's totals — `app/api/quote/accept/route.ts`. Best-effort, so acceptance
  never fails.
- **View itinerary & costing later:** the quote detail page now always offers a
  link into the latest version (labelled "View itinerary & costing" once the quote
  is sent/accepted), so you can revisit how a price was calculated — the version
  page already shows the cost sheet, price lines and itinerary —
  `app/admin/quotes/[id]/page.tsx`.

---

## Appendix — commits

| Commit | Summary |
|--------|---------|
| `e787c82` | EN/AR description fields in the inline add-new dialog |
| `c62c980` | Website polish: photos, contact info, SEO, WhatsApp, testimonials, gallery |
| `92b23f7` | Collapsible itinerary, booking tracking, bookings analytics |
| `00ae490` | Shared domain types; remove `any` from admin search flow |
| `5393030` | Wire client detail page to real quotes, tours and bookings |
| `63bd087` | Link bookings to clients; accepted quotes → confirmed bookings; view quote costing |

## Appendix — migrations

`group_27_booking_client_link.sql` is the new one to run. Earlier migrations of
note in this body of work: `group_22` (Arabic tour days + booking user_id),
`group_23` (rich tour content incl. `hero_image_url`/`gallery_urls`),
`group_24` (tour-media storage), `group_25` (`booking_payments`),
`group_26` (per-day activities). Apply any not-yet-run migrations in order in the
Supabase SQL editor.

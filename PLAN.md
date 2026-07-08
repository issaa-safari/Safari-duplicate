# Closing the SafariOffice Gaps in safari-duplicate

## Context
`safari-duplicate.vercel.app` (Next.js App Router on Vercel + Supabase Postgres/Auth; owner-role admin) already **beats SafariOffice on operations/finance** (Finance AR/AP/P&L, Suppliers + rate cards, dual-track Trip Builder with live margin, Departures + seats, bilingual Arabic proposals, request automation). It **trails SafariOffice** on: (1) the guided **request → finished-quotation flow**, (2) **accommodations Google-Maps + directory**, (3) **per-day itinerary richness** (text + photos in the client proposal), and (4) assorted gaps + bugs. This plan closes those, prioritizing the flow and the maps/directory the user called out.

Full evidence: [../docs/duplicate/GAP-ANALYSIS.md](../docs/duplicate/GAP-ANALYSIS.md) and the SafariOffice reference in [../docs/](../docs/). Screenshots: `../docs/duplicate/screenshots/`.

## Delivery model
Planned now from the live app (I don't have the repo in this session). **Recommended next step: connect the repo** (open the project in Claude Code so it becomes the working directory, or share the GitHub URL). On connect I will: confirm the Supabase schema + existing components, map every task below to real files, then implement. Schema items are written as "add/verify" because the exact current columns aren't visible yet. Google Maps + geospatial scope: **your own accommodations catalog** (geocode + map + radius search), external ingestion explicitly out of scope for now.

Observed current routes to build against: `/admin/requests/[id]` (tabs: info/quotes/tour/logistics/tasks/notes; `+ Create Quote` → `/admin/quotes/new?request=`), `/admin/quotes/[id]` (steps: "Itinerary & details" / "Price in Trip Builder"; versions; Share Links), `/admin/trip-builder`, `/admin/content/accommodations`, public `/quote/[shareId]`.

---

## Workstream 1 — Request → finished-quotation guided flow
**Goal:** one connected, hard-to-get-lost path: **Request (with tour details) → Quote (itinerary pre-filled) → Price → Preview → Send → Accept → Booking**, mirroring SafariOffice's linearity while keeping your Trip Builder pricing strength.

1. **Capture structured tour details on the request** (Tour Information tab): tour type, length/nights, countries, start/end destination, start date, group size, room setup, adults/children. Today the request is thin (Adults only). These become the seed for the quote.
2. **Pre-fill the quote from the request.** `+ Create Quote` should carry request tour-details into the new quote's itinerary skeleton (N day rows, destinations, pax, dates) instead of a blank quote. Reuse the `?request=` linkage already present.
3. **Make the quote a guided stepper** with explicit, gated steps and a persistent progress header: **1 Itinerary & details → 2 Pricing (Trip Builder) → 3 Preview → 4 Send/Finish**. You already have steps 1–2; add an explicit **Preview** step (renders the client proposal read-only) and a **Send/Finish** step (generate share link + PDF, mark Ready/Sent, set request → Open).
4. **Status automation tie-in:** sending a quote moves the request to *Open*; client *Accept* → request *Pre-Booked/Booked* + create Booking; *Decline* → *Not Booked*. (You already have accept/decline + automation; wire the request-stage transitions to quote events.)
5. **"Next step" affordances** on every screen so a consultant is always told what to do next (SafariOffice's key UX win). Empty states link forward ("Add first day", "Price this quote", "Send to client").

Primary surfaces: `/admin/requests/[id]` (tour-info tab), `/admin/quotes/new`, `/admin/quotes/[id]` stepper, `/admin/trip-builder/[quoteId]`, public `/quote/[shareId]`.

## Workstream 2 — Accommodations maps + directory (own catalog)
**Goal:** turn `/admin/content/accommodations` into a SafariOffice-style directory: browse, filter, **map view with pins**, and **proximity search**, over your own catalog.

1. **Geocoding:** add `lat`/`lng` (and `place_id`, formatted address) to accommodations; geocode on save via **Google Geocoding API**; store coordinates in Supabase. Enable **PostGIS** (`geography(Point)`) for radius queries, or compute Haversine in SQL if PostGIS is off.
2. **Address/entry UX:** Google Places **Autocomplete** on the accommodation form to set name/address/coords/place_id in one step (also powers destinations/parks later).
3. **Directory UI:** list + **Map view toggle** (Google Maps JS API with markers + info windows); faceted filters (country, type/class, amenities, price band); text search; sort. Mirror the filter model from SafariOffice ([../docs/01-information-architecture.md](../docs/01-information-architecture.md) §1.3 filter schema).
4. **Proximity search:** "within X km of {destination/park/anchor}" using stored coords → radius query; show results on map.
5. **Use in the builder:** accommodation picker in the itinerary/Trip Builder shows map/pin + distance-to-destination, so consultants pick lodges by location (SafariOffice's key selling point).
6. **Keys/security:** Google Maps **browser key** (referrer-restricted) for the JS map; **server key** for Geocoding/Places calls made from Next.js route handlers; keep server key out of the client.

## Workstream 3 — Per-day itinerary richness (biggest client-facing gap)
**Goal:** the public proposal should read like SafariOffice's — image-led, per-day narrative — not empty day rows.

1. **Data model:** `quote_day` gains `title`, `description` (rich text, bilingual EN/AR), `accommodation_id`, `meal_plan`, `activities[]`, and ordered `photos[]` (media assets). Content can auto-populate from the linked Destination/Accommodation/Activity content (reuse your Content Library), then be edited per quote.
2. **Editor:** in step 1 (Itinerary & details), each day card = title + rich-text (bilingual) + accommodation picker (with map) + meals + activities + image picker (from content library or upload). Support reorder, copy day, add/remove day (SafariOffice parity).
3. **Proposal rendering:** the public `/quote/[shareId]` day-by-day section renders titles, narrative, photos, accommodation blurbs, map snippet per day — RTL-aware (you already do Arabic). Add a **hero/cover image** and destination imagery.
4. **Completeness gate:** a quote can't be marked Ready/shared with empty days (fixes the observed empty-proposal issue).

## Workstream 4 — Everything else from the gap analysis
1. **Tour Templates that seed a quote:** finish `/admin/tours` so a template (days, default accommodations/activities, inclusions/exclusions) can **create a pre-filled quote** in one click. Pre-load a few real templates.
2. **Travelers & flights/logistics:** capture travelers (name, relation, age, dietary, allergies) and flights on the request/booking (the Logistics tab exists but is empty) → feed vouchers/PDF.
3. **Users + roles + 2FA:** Supabase-auth invite flow, roles (owner/admin/consultant/viewer), per-user 2FA, last-sign-in — for staff. (Only `owner` exists today.)
4. **Bug & data-quality fixes:**
   - Analytics **"Conversion Rate: NaN%"** → guard divide-by-zero (show `—`/`0%`).
   - Reconcile **quote counts** across Dashboard (8) / Quotes (17 draft) / Analytics (33) — define and label each metric consistently.
   - **Client validation + dedupe/merge** (invalid `issa@gmail.ckm`, duplicate "Issa Ali", nameless client); required name + email format.
   - **Purge TEST/placeholder data** with a clean seed/reset before go-live.
   - Investigate the **Settings page console error**.
5. **Notes + audit log** per request (activity trail of edits/status changes).

## Data model changes (Supabase — verify against live schema on repo connect)
- `accommodation`: `+lat, +lng, +place_id, +formatted_address` (+ PostGIS `location` or Haversine); indexes for geo + facets.
- `request`: ensure structured tour-detail columns (tour_type, nights, countries[], start/end_destination, start_date, adults, children, group/room JSON).
- `quote_day`: `+title, +description_en, +description_ar, +accommodation_id, +meal_plan, +activities, +photos`.
- `traveler`, `flight` tables (if absent) linked to request.
- `tour_template` content → seedable into quote/quote_day.
- Users/roles: rely on Supabase auth + a `membership(role)` table; enable 2FA (Supabase MFA).

## Google Maps integration specifics
- APIs: **Maps JavaScript API** (map + markers), **Places Autocomplete** (address entry), **Geocoding API** (coords on save), optional **Distance Matrix** (drive-time between stops).
- Client: browser key restricted by HTTP referrer; load via `@googlemaps/js-api-loader` or `@react-google-maps/api`.
- Server: geocoding/places in Next.js route handlers with a referrer-unrestricted server key stored in env (never shipped to client); cache results by `place_id`.
- Cost control: geocode once on save (not on every render); cache; debounce autocomplete.

## Sequencing (phased, shippable)
1. **P0:** bug/data fixes (NaN, counts, client validation, seed cleanup) + quote completeness gate — quick wins, safe before real clients.
2. **P0:** Workstream 3 (per-day richness) + Workstream 1 (guided flow) — the core value; do together since they touch the same quote screens.
3. **P1:** Workstream 2 (maps + directory) — geocoding → directory/map → picker integration.
4. **P1:** Templates seed-a-quote; travelers/flights.
5. **P2:** users/roles/2FA; notes + audit log.

## Verification
- **Flow:** create a request with full tour details → Create Quote (days pre-filled) → price in Trip Builder → Preview → Send → open public link → Accept → confirm request became Booked + Booking created. Drive end-to-end with Playwright MCP on a throwaway record, then archive/delete it.
- **Maps:** add an accommodation via Places autocomplete → confirm coords stored → appears as a map pin → radius search returns it → picker shows distance.
- **Richness:** build a 3-day quote with text+photos → public proposal renders narrative + images in EN and AR (RTL) → PDF matches.
- **Fixes:** Analytics shows `0%` not NaN with zero decided; dashboard/quotes/analytics counts reconcile; invalid client email rejected; no TEST records in a fresh seed.
- Run typecheck/build/tests once the repo is connected; add e2e for the flow and geo search.

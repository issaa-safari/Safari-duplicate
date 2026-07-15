# Handoff — Continue the safari-duplicate gap-closing work

This lets a **fresh Claude session (any account)** pick up the implementation cold. Give the new session (a) these files, (b) the access below, and (c) the kickoff prompt at the bottom.

---

## 1. What this project is (30-second brief)
- **safari-duplicate** = an admin/ops platform for a Kenya/Tanzania safari operator (*Safari Adventure Riders*).
- **Stack:** Next.js (App Router, Turbopack) on **Vercel** + **Supabase** (Postgres + Auth). Supabase project ref: `oejlkzcoynijqtokbizz`. Font IBM Plex Sans; warm safari theme.
- **Live admin:** https://safari-duplicate.vercel.app/admin/dashboard . Public proposal: `https://safari-duplicate.vercel.app/quote/{shareId}`.
- We analyzed a competitor (**SafariOffice**) and this app, then made a plan to close the gaps. **The build has NOT started** — the previous session had no repo access.

## 2. The job (what to implement)
Follow **[PLAN.md](PLAN.md)** — four workstreams:
1. **W1 – Request → finished-quote guided flow** (pre-fill quote from request; 4-step gated stepper Itinerary→Pricing→Preview→Send; wire status automation).
2. **W2 – Accommodations Google Maps + directory** on the *own catalog* (geocode, Places autocomplete, map/list directory, radius search, use in builder). External ingestion is out of scope.
3. **W3 – Per-day itinerary richness** (per-day title/description EN+AR/accommodation/meals/activities/photos; rich public proposal; completeness gate). *Biggest client-facing gap.*
4. **W4 – Rest:** templates that seed a quote; travelers/flights; users+roles+2FA; bug/data fixes (NaN% conversion, quote-count mismatch, client validation/dedupe, TEST-data cleanup, settings console error); notes + audit log.

Sequencing in PLAN.md: P0 = bug/data fixes + W3 + W1; P1 = W2 + templates/travelers; P2 = users/2FA + audit log.

## 3. Read these first (all in this folder / parent)
- **[PLAN.md](PLAN.md)** — the approved implementation plan (start here).
- **[GAP-ANALYSIS.md](GAP-ANALYSIS.md)** — feature-by-feature comparison, bugs, priorities.
- **[../IMPLEMENTATION-BLUEPRINT.md](../IMPLEMENTATION-BLUEPRINT.md)** + **[../01…11 docs](../)** — SafariOffice reference. Especially:
  - `../01-information-architecture.md` §1.3 — the **accommodations filter schema** to mirror (W2).
  - `../02-user-flows.md` §2.4–2.7 — the **request→quote→booking flow** to mirror (W1).
  - `../05-data-model.md` — entity/field reference (W3 quote_day, travelers, flights).
- **screenshots/** (this app) and **../screenshots/** (SafariOffice) — visual reference.
> If the new session is in a different environment, copy the whole `docs/` folder into the repo (e.g. `/<repo>/docs/`) so Claude can read it.

## 4. Access the new session needs (the human provides these)
**Required to write code:**
- [ ] **The repo** — open the safari-duplicate project in Claude Code so it's the working directory (or provide the GitHub URL and let Claude clone it). Then `pnpm install` / `npm install`.

**Required to build the new features & verify:**
- [ ] **Supabase access** to apply migrations — either the **Supabase MCP** connected to project `oejlkzcoynijqtokbizz`, or the **Supabase CLI** linked (`supabase link`), or the DB connection string in env. Needed for schema changes in PLAN.md §"Data model changes".
- [ ] **Google Maps API keys** (create in Google Cloud; enable **Maps JavaScript API**, **Places API**, **Geocoding API**):
  - `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` — HTTP-referrer restricted (client map).
  - `GOOGLE_MAPS_SERVER_KEY` — unrestricted-by-referrer, **server-only** (geocoding/places in route handlers).
- [ ] **`.env.local`** with the existing Supabase vars (`NEXT_PUBLIC_SUPABASE_URL`, anon key, `SUPABASE_SERVICE_ROLE_KEY`) + the two Maps keys above. *(Copy from Vercel project env; don't paste secrets into chat — put them in the env file.)*
- [ ] **An admin login** (email + password) for the app, so Claude can drive Playwright end-to-end verification.

**Optional/helpful:**
- [ ] Vercel project access (preview deploys). GitHub push rights (branch + PR).

## 5. MCP tools to connect in the new session
- **Playwright MCP** — already installed globally (`@playwright/mcp`); add it to the new session's MCP config for verifying flows in the browser. Chromium is installed.
- **Supabase MCP** — connect to project `oejlkzcoynijqtokbizz` to apply/inspect migrations (or use Supabase CLI instead).

## 6. Ground rules (carry these over)
- **Verify against the real schema/components before coding** — PLAN.md marks DB items "add/verify" because the previous session couldn't see the code. Confirm column/table names first.
- **Migrations are additive** where possible; back up / use a branch DB before destructive changes.
- **Don't commit secrets.** Keys go in env/Vercel, never in the repo or chat.
- **Test on throwaway records** (Playwright), then archive/delete — as done previously (e.g. requests named `ZZ-QA-TEST-DELETE`). Don't touch real client data.
- Keep the **bilingual EN/AR (RTL)** support intact in every new UI/proposal surface.

## 7. Definition of done (first milestone)
An operator can: create a request with full tour details → **Create Quote (days pre-filled)** → price in Trip Builder → **Preview** → **Send** → open the public link (rich, image-led, EN + AR) → **Accept** → request auto-moves to Booked + Booking created. Plus: accommodations have a **map/directory with radius search**, and the **NaN%/count/validation bugs are fixed**. Verify per PLAN.md §Verification.

---

## 8. Kickoff prompt (paste as the first message in the new Claude session)
> I'm continuing an in-progress project. Read `docs/duplicate/HANDOFF.md`, then `docs/duplicate/PLAN.md` and `docs/duplicate/GAP-ANALYSIS.md`, and skim the SafariOffice reference in `docs/`. This is a Next.js + Supabase safari tour-operator admin (safari-duplicate). The plan closes gaps vs a competitor across 4 workstreams. Start with Phase P0 from PLAN.md: (1) verify the current Supabase schema and the quote/request code paths, (2) fix the bug/data issues (NaN% conversion rate, quote-count mismatch, client email validation/dedupe, TEST-data cleanup), and (3) begin the request→quote guided flow + per-day itinerary richness. Before writing migrations, confirm the live table/column names. Ask me for anything you need (env vars, Google Maps keys, admin login). Use the Playwright MCP to verify end-to-end on throwaway records.

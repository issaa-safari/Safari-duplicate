# Feature Roadmap — SafariOffice parity & enhancement plan

**Date:** 2026-07-15 · **Codebase checkpoint:** migrations through `group_54`, 28 merged PRs.

This document replaces the stale `GAP-ANALYSIS.md` snapshot (now in
`docs/archive/build-planning/`). It mines the SafariOffice competitor analysis in
`docs/reference/safarioffice/` for features worth having, then diffs each against
the app **as actually built** (Next.js 16 + Supabase), citing the real route or
migration table. It closes with prioritized enhancement suggestions.

**This is analysis only — no code changes are proposed as part of this doc.**

## How to read this

- **Source of the feature list:** `docs/reference/safarioffice/10-feature-inventory.md`
  (P0–P3 priorities), cross-referenced with `01` (IA), `02` (user flows),
  `05` (data model), `06` (API).
- **Status is about *our* app, not SafariOffice.** SafariOffice priorities (P0–P3)
  are the vendor's; they are kept only to show what the reference product treats as core.
- **Deliberate scope differences.** Safari Adventure Riders is a **single-tenant**
  deployment for one operator. SafariOffice is a multi-tenant SaaS. Features that
  exist *only because* SafariOffice sells seats to many companies (multi-tenancy,
  per-tenant billing, add-on store, white-label labels) are marked **N/A (out of scope)**,
  not "Missing" — they are not gaps for this product.

---

## 1. Parity matrix

Legend: **Done** · **Partial** (some of it exists) · **Missing** · **N/A** (out of scope for a single-tenant build).

| SafariOffice feature | Their pri. | Status | Where it lives here / why |
|---|---|---|---|
| Authentication | P0 | **Done** | Supabase Auth cookie sessions; `proxy.ts` gates `/admin/:path*`; `app/admin/login`, `app/(public)/login`, `/auth/callback` (PKCE). |
| 2FA (TOTP) | P1 | **Missing** | No MFA/enrolment anywhere. `app/(public)/dashboard/security` is password-only. |
| Multi-tenancy | P0 | **N/A** | Single-tenant by design; authz is `admin_users` membership, not `company_id` isolation. |
| User management (invite / roles / seats) | P0 | **Missing** | Admins are added by raw SQL insert into `admin_users` only. No invite UI, no role management. *(Gap #7)* |
| Clients (CRM) | P0 | **Done** | `app/admin/clients`, `clients/[id]`; email validation + auto-dedupe in `lib/server/clients.ts` + DB unique index. *(Gap #5)* |
| Requests pipeline (board, counts, filters) | P0 | **Done** | `app/admin/requests`; stage moves via `api/admin/update-stage`. |
| Add Request wizard | P0 | **Done** | `app/admin/requests/new` (+ `requests/[id]/edit`). |
| Request detail (info/quotes/tasks/notes) | P0 | **Done** | `app/admin/requests/[id]`. |
| Quote builder — day-by-day | P0 | **Done** | `app/admin/trip-builder`; tables `quote_days`, `quote_day_items` (meals, accommodation, activities). *(Gap #2)* |
| Quote builder — pricing | P0 | **Done** | `group_52_single_track_pricing`; per-traveller-type sale prices + editable inclusions/exclusions (PR #28). |
| Quote builder — preview/edit | P0 | **Done** | `components/quote/proposal-view.tsx`. |
| Quote builder — finish/publish + versioning | P0 | **Done** | `quote_versions`; `create_quote_with_version`, `copy_quote_as_new` RPCs. |
| Send quote to client | P1 | **Partial** | Shared as a tokenised link (`app/quote/[token]`) with `sent`/viewed status tracking; email infra exists (`lib/email.ts`) but there is no one-click "email this quote" action. |
| Bookings | P0 | **Done** | `app/admin/bookings`, `bookings/[id]`; `api/quote/accept` converts quote → booking. |
| Tasks checklist | P1 | **Done** | `group_38_smart_tasks` extends `tasks`, adds `default_tasks` + auto-generation trigger; `app/admin/settings/default-tasks`. |
| Notes (per request) | P1 | **Done** | `communication_logs` + UI. *(Gap #8)* |
| Travelers (relation/age/dietary/allergies) | P0 | **Partial** | Captured on the public request form only; **no admin editor** to view/edit dietary & allergy fields. *(Gap #4)* |
| Flights (per request) | P1 | **Done** | `request_flights` table + full admin UI. *(Gap #4)* |
| Tour staff / vehicles | P1 | **Done** | `app/admin/content/{tour-staff,staff,vehicles}`. |
| Tour Templates | P1 | **Done** | `app/admin/tour-templates`; template flag + `copy_quote_as_new`, and prefill from `tour_days`. *(Gap #3)* |
| Accommodations directory | P0 | **Partial** | `app/admin/content/accommodations` with media (images, gallery/video URLs). Missing: geo-radius/map filtering and **bulk import**. *(Gap #10)* |
| Content Library (destinations/activities/parks/vehicles/staff/rates) | P0 | **Done** | Full `app/admin/content/*` tree. |
| Reference data / enums | P0 | **Done** | Lookup tables + `api/admin/create-lookup`. |
| White-label labels | P2 | **N/A** | Single-tenant; no per-tenant term overrides needed. |
| Insights (analytics) | P1 | **Done** | `app/admin/analytics`; divide-by-zero guarded (`—` instead of `NaN`). *(Gap #1; count-grain caveat — Gap #11.)* |
| System settings | P0 | **Done** | `app/admin/settings`. |
| Profile (personal details, signature, notifications) | P0 | **Partial** | Client portal has `dashboard/settings` + `dashboard/security`; no dedicated admin-user profile/signature screen. |
| Notifications (email prefs) | P1 | **Partial** | Event automation exists (`api/cron/daily-automation`, `lib/email.ts`, WhatsApp webhook); no per-user email-preference UI. |
| Billing & subscriptions | P1 | **N/A** | Single-tenant; no SaaS billing. |
| Add-on store | P2 | **N/A** | SaaS marketplace concept; out of scope. |
| Multi-language quotes | P2 | **Done (EN/AR)** | Proposal renders bilingual EN/AR (RTL); the reference product's FR/DE/ES pack is not a requirement here. |
| Traveler app (SafariBuddy) | P3 | **Missing** | No client mobile app. |
| Public digital proposal | P0 | **Done** | `app/quote/[token]` + `proposal-view.tsx`. |
| PDF generation | P0 | **Done** (print-based) | Branded print route `app/quote/[token]/print` + print toolbar; PDF via browser print, not a server PDF service. |
| Support widget | P3 | **Missing** | No in-app support/feedback widget. |
| Product analytics / telemetry | P2 | **Missing** | No GA4/GTM/Hotjar-equivalent instrumentation. |
| Import — CSV / inbound-email intake | P2 | **Missing** | No bulk importer or email-to-request intake. *(Gap #10)* |
| Audit log | P2 | **Missing** | No general "who changed what/when" history. *(Gap #8)* |

**Scorecard (excluding N/A):** Done ~20 · Partial 5 · Missing 6.

---

## 2. Verified gaps (the actionable set)

These twelve items were cross-checked against the code at `group_54`. They are the
concrete, in-scope work — each is a real gap in *this* app, not a scope difference.

| # | Gap | Verdict | Evidence |
|---|---|---|---|
| 1 | Analytics "Conversion Rate: NaN%" | **Resolved** | `app/admin/analytics/page.tsx` returns `—` when the denominator is 0; `conversionRate` is null-guarded. |
| 2 | Per-day itinerary richness + public proposal | **Done** | `quote_days` / `quote_day_items` + `proposal-view.tsx`, EN/AR, meals, accommodation, photos. |
| 3 | Tour templates → seed a quote | **Done** | Template flag + `copy_quote_as_new`; `create_quote_with_version` prefills from `tour_days`. |
| 4 | Traveller details + flights on requests | **Partial** | Flights done (`request_flights` + UI). **Traveller dietary/allergy fields captured on the public form only — no admin editor.** |
| 5 | Client validation / dedupe | **Done** | Email validation + auto-dedupe (`lib/server/clients.ts` + unique index). No manual merge UI (acceptable). |
| 6 | Quote completeness gate | **Missing** | `setVersionStatus` (`app/admin/quotes/[id]/versions/[versionId]/actions.ts`) validates only the `draft→ready→sent` transition — an **empty-day version can be marked Ready/Sent**. |
| 7 | Team / invites / roles / MFA | **Missing** | Admins added by raw SQL; no invite UI, no role management, no MFA. |
| 8 | Audit / activity log | **Partial** | Per-request notes done (`communication_logs`); **no general audit log** of edits/status changes. |
| 9 | Payment collection on accepted quotes | **Partial** | Manual recording exists (`group_25_booking_payments`, Finance module); **no payment section on the booking page, no client-facing payment link**. |
| 10 | Accommodations bulk import + media | **Partial** | Media enrichment done; **no CSV/bulk importer**. |
| 11 | Count consistency (Dashboard / Quotes / Analytics) | **Inconsistent** | Dashboard & Analytics count `quote_versions`; the Quotes list counts parent `quotes` rows — a multi-version quote is counted differently across the three views. |
| 12 | Settings page load safety | **OK** | Server-side guard + fallback UI; no issue. |

---

## 3. Prioritized enhancement suggestions

Ranked by value-for-effort for a single-operator business. Each names a **source**
in `docs/reference/safarioffice/` (or a gap above) and a **proposed landing spot**
in the current architecture. **Suggestions only.**

### P0 — data-integrity & correctness (do first)

1. **Quote completeness gate** *(Gap #6; source `02-user-flows.md`, `10` "finish/publish")*
   Block a version from `ready`/`sent` unless it has ≥1 `quote_day` with content.
   *Landing spot:* add the check inside `setVersionStatus`
   (`app/admin/quotes/[id]/versions/[versionId]/actions.ts`) — count `quote_days`
   for the version before allowing the transition. Cheap, high-impact (stops sending empty proposals).

2. **Unify quote counts across views** *(Gap #11; source `10` "Insights")*
   Pick one grain (parent `quotes`) and use it everywhere, or label each view's grain.
   *Landing spot:* the dashboard/analytics aggregation queries vs. the `app/admin/quotes`
   list query — reconcile to a shared helper in `lib/server/`.

### P1 — close the request/booking loop

3. **Admin traveller editor** *(Gap #4; source `04-forms.md`, `10` "Travelers" P0)*
   Surface and edit `travellers` dietary/allergy/relation/age fields inside the request
   detail — today they're write-only from the public form.
   *Landing spot:* a sub-tab/section under `app/admin/requests/[id]`.

4. **Payment section on the booking page + client payment link** *(Gap #9; source `10` "Bookings", `06-api.md`)*
   Show `booking_payments` on `app/admin/bookings/[id]` with a balance; optionally expose a
   client-facing pay link on `app/quote/[token]` / `app/(public)/dashboard/bookings/[id]`.
   *Landing spot:* extend the booking detail server component + a new payments panel; Stripe
   optional (infra doesn't exist yet).

5. **One-click "email quote to client"** *(source `10` "Send quote to client" P1, `02-user-flows.md`)*
   Wire the existing share link into an email send using `lib/email.ts`, recording sent/viewed.
   *Landing spot:* an action on the quote version preview/send panel.

### P2 — team & trust

6. **Admin invite + roles UI** *(Gap #7; source `10` "User management" P0)*
   Even single-tenant benefits from an invite flow and an Admin/Editor distinction instead of
   raw SQL inserts into `admin_users`.
   *Landing spot:* a new `app/admin/settings/team` screen + `admin_users` role column.

7. **Audit log** *(Gap #8; source `10` "Audit log (recommended new)")*
   A generic `activity_log` table (actor, entity, action, before/after, at) written from the
   server actions that mutate requests/quotes/bookings.
   *Landing spot:* new `migrations/group_NN_activity_log.sql` + a small `lib/server/audit.ts`
   helper called from existing actions; view under request/quote detail.

8. **Accommodations bulk CSV import** *(Gap #10; source `10` "Import (recommended new)")*
   *Landing spot:* an importer action under `app/admin/content/accommodations` reusing
   `createAccommodation`, plus `api/admin/upload` for the file.

### P3 — differentiators (later)

9. **Optional 2FA (TOTP)** *(source `10` "2FA" P1, `07-authentication.md`)* — Supabase Auth supports
   MFA enrolment; surface it on `app/(public)/dashboard/security` and for admin users.
10. **Geo/map filtering for accommodations** *(source `10` "Accommodations directory", `05-data-model.md`)* —
    add lat/lng + radius filter; the reference schema's PostGIS approach is overkill, a simple
    bounding-box query suffices.
11. **Inbound-email request intake** *(source `10` "Import")* — parse forwarded enquiry emails into
    `requests` via a webhook, mirroring the existing `api/webhooks/whatsapp` pattern.

---

## Appendix — informational migration notes

- `group_38_smart_tasks` — extends `tasks`, adds `default_tasks` + trigger for auto-generated
  stage/accommodation tasks.
- `group_46_request_trip_length` — adds `requests.trip_length_nights`.
- `group_49_request_room_type` — adds `requests.preferred_room_type`.
- `group_50_tour_day_alt_accommodation` — adds `tour_days.accommodation_alt_id` FK.
- `group_52_single_track_pricing` — collapses pricing to a single track.
- `group_28` is intentionally absent from the migration sequence (27 → 29). The partner spec
  `docs/current/write-path-integrity-spec.md` describes code that **is** implemented; whether the
  matching SQL was applied directly in Supabase or never applied is an open question worth confirming.

# Implementation Blueprint — Building a SafariOffice-Equivalent Platform

A single document an engineer can build from. It consolidates the analysis in this `/docs` set into an actionable plan for an **original** product (no proprietary code, assets, or branding copied). Target stack: **Next.js + NestJS + PostgreSQL**.

> Deep-dive references: [IA](01-information-architecture.md) · [Flows](02-user-flows.md) · [UI](03-ui-components.md) · [Forms](04-forms.md) · [Data model/ERD](05-data-model.md) · [API](06-api.md) · [Auth](07-authentication.md) · [UX](08-ux-analysis.md) · [Design](09-design-system.md) · [Features](10-feature-inventory.md) · [Stack](11-tech-stack.md) · [PRD](specs/PRD.md) · [Tech spec](specs/technical-spec.md) · [DB](specs/database-schema.sql) · [OpenAPI](specs/openapi.yaml) · [Components](specs/component-inventory.md) · [Folders](specs/folder-structure.md) · [Roadmap](specs/roadmap.md) · [Sprints](specs/sprint-plan.md) · [Testing](specs/testing-checklist.md)

## 1. What you're building
A multi-tenant SaaS where tour operators turn inbound trip **Requests** into branded multi-day **Quotes/Proposals** (PDF + interactive digital page on a per-tenant subdomain), then manage them through **Booking → Completion**. It is powered by a large **shared Accommodations database**, an operator **Content Library**, a **Clients CRM**, **Insights** analytics, reusable **Tour Templates**, and tenant **Settings/Billing/Add-ons**.

## 2. The three things that make it work (build these well)
1. **The pipeline** — a status board (New → Working On → Open → Pre-Booked → Booked → Completed / Not Booked / Archived, plus Running Tours) with fast filtering, counts, and guarded transitions. This is the operator's home.
2. **The quote builder** — a 4-step wizard (day-by-day itinerary → pricing → preview/edit → finish/publish) producing versioned PDF + digital proposals. This is the product's core value and hardest UI.
3. **The content moat** — a credible shared Accommodations directory (faceted + geo radius search) plus the operator's Content Library feeding the builder. Plan data sourcing early.

## 3. Architecture at a glance
- **Operator web app** (Next.js, authenticated) + **public proposal renderer** (Next.js, `*.proposals.app` per tenant) → one **NestJS API** (`/api/v1`) → **PostgreSQL + PostGIS**, **Redis/BullMQ** (PDF/email/import jobs), **S3** (media + PDFs), email provider. See [technical-spec](specs/technical-spec.md) + [diagram there].
- **Multi-tenancy:** `company_id` on every tenant table, enforced by a guard + Prisma middleware; shared/global tables (accommodations, countries, airports) readable across tenants with per-tenant favorites/overlays.
- **Auth:** JWT access (httpOnly) + rotating refresh, TOTP 2FA, RBAC (`owner/admin/member/viewer`, `no_access` = disabled seat). See [07](07-authentication.md).
- **Reference data:** `/reference/versions` map + `/reference/{dataset}` with client-side version-cached storage — replicate this; it's why the original feels instant. ~45 datasets ([06](06-api.md)).
- **API envelope:** `{success, result}` / `{success:false, error, error_msg, error_code}` with typed codes.

## 4. Data model (essentials)
Company → Users, Clients, Requests, Templates, Vehicles, TourStaff, ReferenceValues, Subscription, Add-ons. Client → Requests. Request → Quotes, Travelers, Flights, Tasks, Notes. Quote → QuoteDays (→ QuoteItems) + QuotePositions; may derive from a Template. Accommodation/Activity/Destination/Theme + MediaAssets (global or tenant). Full ERD + field lists in [05](05-data-model.md); ready-to-run DDL in [database-schema.sql](specs/database-schema.sql). Key rules: money as integer minor units + currency; `refno = {prefix}{YYYY}-{seq}`; quote version `refno.N`; delete-request blocked once quotes exist (archive instead).

## 5. Screen-by-screen build list
| Area | Route(s) | Must-have behaviors |
|---|---|---|
| Sign in | `/signin` | email/password, 2FA, refresh session |
| Requests board | `/requests` (+status tabs) | counts, handled-by filter, sort, search, empty states |
| Add request | wizard | 2 steps, refno, existing-client, group/room rows |
| Request/booking detail | detail sub-tabs | info/quotes/tour-info/tasks/notes; travelers/flights/staff/vehicles; status actions; archive |
| Quote builder | `/quote/{req}-{quote}/{step}` | day-by-day, pricing, preview/edit, finish→PDF+digital, versioning, gating |
| Public proposal | `{tenant}.proposals.app/{slug}` | responsive, branded, same template as PDF; open tracking |
| Templates | `/templates` | grid, draft/ready, copy/lock/share, seed quote |
| Accommodations | `/accommodations` | facets, geo radius, list/map, favorites, premium (filter state shareable) |
| Content Library | `/contentlibrary/*` | destinations/activities/themes/countries/vehicles/staff + media tabs + quotas |
| Clients | `/clients` | CRUD, search, pagination, requests rollup |
| Insights | `/insights` | KPIs, source chart, conversion, date/user filters, include-archived |
| Settings | `/profile,/users,/company,/billing,/subscriptions,/settings,/addons` | profile+2FA, user lifecycle, tenant config, billing, add-on store |
Component breakdown in [component-inventory](specs/component-inventory.md); layout/tokens in [design-system](09-design-system.md).

## 6. Design system (original, inspired not copied)
Inter (UI) + Playfair Display (accents); base 15px; brand green `#16b408` for fills/large text but a **darker green (~`#0f7d06`) for small text** (AA); neutrals `#111/#666/#f5f5f5/#fff/#ccc`; radii 6px inputs / pill buttons; soft grey card shadow; 4px spacing rhythm. Tokens in [09](09-design-system.md). Use your own logo, icon set (Lucide/Phosphor), and illustrations.

## 7. Build order (see [roadmap](specs/roadmap.md) + [sprint-plan](specs/sprint-plan.md))
Foundation → Auth/tenancy → Clients/Requests → Add-wizard → Quote builder (itinerary→pricing) → Publish/bookings → Content Library → Accommodations → request depth+templates+email → Insights/settings → billing/add-ons → polish (a11y/mobile/perf/imports/audit) → beta. ~14 two-week sprints for a small team.

## 8. Definition of done for the MVP
An operator can: sign in (with 2FA), create a client + request via the wizard, build a multi-day quote, price it, publish PDF + digital proposal on their subdomain, send it, and convert it to a booking — all tenant-isolated, with reference-data caching and the core settings that drive refno/currency/date formatting. Verify against [testing-checklist](specs/testing-checklist.md).

## 9. Risks & how to de-risk
- **Accommodations data** (the real moat): budget an ingestion/curation pipeline + allow tenant contributions; ship with a seeded subset.
- **PDF fidelity/perf**: one shared template for digital+PDF; visual-regression tests; queue + backpressure for rendering.
- **Money correctness**: integer minor units, currency-aware rounding, server-computed totals.
- **Tenant leakage**: enforce scoping in middleware and assert cross-tenant 404 in integration tests.
- **Accessibility debt**: adopt native `<button>`, ARIA combobox, focus traps, AA contrast from the start (the original under-delivers here — an easy differentiator).

## 10. Legal / clean-room note
This blueprint is a functional specification derived from observing a live product with the account owner's authorization. Build original code, schema, copy, icons, and branding. Do not reuse SafariOffice's HTML/CSS/JS, icon font, images, wording, or the "SafariOffice" name/marks. The shared accommodation records and any third-party content are not yours to copy — source your own.

---

## Appendix — Objective coverage (the 14 asks)
| # | Objective | Where |
|---|---|---|
| 1 | Information Architecture | [01](01-information-architecture.md) |
| 2 | User Flows | [02](02-user-flows.md) |
| 3 | UI Components | [03](03-ui-components.md) |
| 4 | Forms | [04](04-forms.md) |
| 5 | Data Model + ERD | [05](05-data-model.md) |
| 6 | API Analysis | [06](06-api.md) + [network/](network/) |
| 7 | Authentication | [07](07-authentication.md) |
| 8 | UX Analysis | [08](08-ux-analysis.md) |
| 9 | Visual Design System | [09](09-design-system.md) |
| 10 | Feature Inventory | [10](10-feature-inventory.md) |
| 11 | Technical Stack | [11](11-tech-stack.md) |
| 12 | Build Specification | [specs/](specs/) |
| 13 | Screenshots | [screenshots/](screenshots/) |
| 14 | Navigation Strategy | [01 §1.6](01-information-architecture.md) |

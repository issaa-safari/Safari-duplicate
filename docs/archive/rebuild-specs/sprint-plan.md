# Sprint Plan (2-week sprints)

Assumes a small team (2–3 full-stack + 1 design/QA). Roughly maps to the [roadmap](roadmap.md). Each sprint ends shippable/demoable.

| Sprint | Theme | Key deliverables | Definition of done |
|---|---|---|---|
| **S1** | Platform foundation | Monorepo, CI/CD, Docker (PG+PostGIS/Redis/MinIO), Prisma schema v1, seed reference data, design tokens + core UI primitives | App boots; migrations+seed run; Storybook for primitives |
| **S2** | Auth & tenancy | Sign-in, JWT access+refresh, cookies, TenantGuard, RBAC, TOTP 2FA, users invite/lifecycle | Login + refresh + 2FA work; cross-tenant access blocked (tests) |
| **S3** | Clients & Requests board | Clients CRUD/search/pagination; Requests list by status, filters, sort, search, counts | Board renders real data; filters/sort/search verified |
| **S4** | Add-Request wizard | 2-step wizard, refno numbering, existing-client picker, group/room rows, inline edits, archive/guarded-delete | Create→detail flow; delete disabled when quotes exist |
| **S5** | Quote builder I (itinerary) | day-by-day builder (days, accommodation/activity pickers, meals/options), autosave | Build a multi-day itinerary; persists; reorders |
| **S6** | Quote builder II (pricing) | positions, margins, currency, pax tiers, totals server-computed, gating | Priced quote; money correct; gating enforced |
| **S7** | Publish & bookings | preview/edit, digital proposal (public SSR), PDF worker, send + tracking, versioning; convert to booking | PDF+digital generated on subdomain; booking created; version `refno.N` |
| **S8** | Content Library | destinations/activities/themes/countries/vehicles/tour staff + media uploads + quotas + filters | CRUD + media + with/without/archived filters |
| **S9** | Accommodations directory | shared catalog, facet filters, geo radius (PostGIS), list/map, favorites, premium | Faceted + radius search; map view; favorites |
| **S10** | Request depth | tasks, notes, travelers, flights, tour staff, vehicles; templates (copy/lock/share, seed quote); email notifications | All sub-tabs functional; template seeds a quote |
| **S11** | Insights & settings | KPI dashboard, source chart, conversion, filters, include-archived; system settings; profile completeness | KPIs match seed data; settings drive rendering |
| **S12** | Billing & add-ons | Stripe subscriptions, seats, billing info, add-on store framework, trials | Upgrade/downgrade; seat gating; add-on activate |
| **S13** | Polish & hardening | a11y (contrast/ARIA/focus), mobile responsiveness, perf (ETags/CDN), audit log, imports (CSV/email) | WCAG AA checks pass; Lighthouse targets; imports work |
| **S14** | Beta & buffer | bug bash, load test, docs, demo tenant, launch checklist | Beta sign-off; runbooks ready |

**Backlog / later:** multi-language quotes, white-label labels UI, traveler app, advanced search engine, deeper reporting/exports.

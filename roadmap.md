# Development Roadmap

Phased delivery from foundation to differentiators. Each phase is shippable.

## Phase 0 — Foundation (infra & platform)
- Monorepo (Turborepo), CI/CD, envs; Docker (Postgres+PostGIS, Redis, MinIO).
- Prisma schema + migrations + reference-data seed; typed API client from OpenAPI.
- Auth (JWT access+refresh, cookies), TenantGuard, RBAC scaffolding, design-system tokens & primitives.

## Phase 1 — MVP core (lead → quote → booking)
- Companies, Users (invite/roles/2FA), Clients (CRUD/search/pagination).
- Requests pipeline (board, filters, sort, search), Add-Request wizard, refno numbering, inline edits, archive/guarded-delete.
- Quote builder: day-by-day → pricing → preview → finish; PDF + digital publish (worker + tenant subdomain); send + tracking; versioning.
- Bookings (convert, value, confirmed version).
- Reference data (versions + datasets + custom values) with client cache.
- System settings, profile.
- **Outcome:** an operator can go lead → sent proposal → booking.

## Phase 2 — Depth & content
- Content Library (destinations/activities/themes/countries/vehicles/tour staff + media + quotas).
- Accommodations directory (facets, geo radius, list/map, favorites, premium).
- Tasks, notes, travelers, flights, tour staff, vehicles on requests/bookings.
- Tour Templates (draft/ready, copy/lock/share, seed quotes).
- Email notifications.

## Phase 3 — Analytics & monetization
- Insights dashboard (KPIs, source chart, conversion, filters, include-archived).
- Billing & subscriptions (Stripe), seat management.
- Add-on store framework.

## Phase 4 — Differentiators & polish
- Multi-language quotes (i18n), white-label labels UI.
- Imports (CSV clients, inbound-email request intake), audit log.
- Accessibility hardening, mobile responsiveness, performance (ETags, image CDN).
- Optional: traveler app (SafariBuddy-equivalent), advanced search (Meili/Elastic), map enrichments.

## Cross-phase (continuous)
Observability (Sentry/OTel), security reviews, test coverage, docs, seed/demo tenant.

# Product Requirements Document — "Safari Ops" (working title)

## 1. Overview
A multi-tenant SaaS for safari/tour operators to capture trip **requests**, build multi-day **quotes/proposals**, publish branded **PDF + digital** proposals, and manage the pipeline through **booking** and **completion** — with a shared **accommodations** database, an operator **content library**, **CRM**, and **analytics**. Functionally equivalent to SafariOffice, built from scratch on Next.js + NestJS + PostgreSQL.

## 2. Goals & non-goals
**Goals:** (1) shorten quote turnaround; (2) professional, on-brand client proposals; (3) a single pipeline from lead to completed tour; (4) reusable content & templates; (5) team collaboration with roles; (6) actionable conversion analytics.
**Non-goals (v1):** payment collection from travelers, full accounting, channel-manager/OTA integration, native mobile apps (digital proposal is responsive web).

## 3. Personas
- **Operator/Owner (Admin):** configures company, users, billing, settings.
- **Tour Consultant (User):** handles requests, builds quotes, books tours.
- **Client/Traveler (external):** receives and views digital/PDF proposals.

## 4. Key user journeys
1. Lead → **create request** (wizard) → assign consultant.
2. Request → **build quote** (day-by-day → pricing → preview → finish) → send.
3. Client views digital proposal → consultant marks **Pre-Booked/Booked**.
4. Booking → tasks/travelers/flights/staff/vehicles managed → **Completed**.
5. Owner reviews **Insights**; manages team, content, and settings.

## 5. Functional requirements (by module)
- **Auth & tenancy:** email/password, refresh tokens, TOTP 2FA, company isolation, role-based access, per-tenant settings + delivery subdomain.
- **Requests:** pipeline statuses (New, Working On, Open, Pre-Booked, Booked, Completed, Not Booked, Archived, Running); board with counts, handled-by filter, sort, search; 2-step add wizard; refno numbering (prefix/seq/year/name-letters); inline edits; archive (guarded delete).
- **Quotes:** multiple versions per request (`refno.N`); day-by-day itinerary (accommodation, activities, meals, options, transfers, notes; copy/clear/delete/add day); pricing (positions, margins, currency, per-person age tiers); preview & rich-text/image editing; finish → PDF + digital publish + email send; open/sent tracking.
- **Bookings:** convert from quote; booking value; tasks checklist; travelers; flights; responsible user; tour staff; vehicles.
- **Content Library:** destinations, activities, themes, countries, vehicles, tour staff; media (images/covers/videos) with storage quotas; with/without-content and archived filters.
- **Accommodations directory:** shared global properties; faceted filters (country/type/class/services/facilities/amenities/room-types/location); geo radius search; list/map; favorites; premium listings.
- **Clients (CRM):** CRUD, search, pagination, requests rollup; auto-create on request.
- **Insights:** received requests, requests per source, sent quotes, avg days-to-booking, avg quote value, confirmed bookings, conversion %, avg & total booking value; date-range + user filters; include-archived toggle.
- **Settings:** currencies, default currency, date formats, first day of week, refno config, quote-version scheme, white-label labels.
- **Profile:** details, avatar, password, signature, 2FA, notification prefs, onboarding progress.
- **Billing/Add-ons:** plans, seats, billing info; add-on marketplace (multi-language, traveler app, share tours, content library tiers) with trials.
- **Reference data:** ~45 enum datasets with version-map caching; custom tenant values.

## 6. Non-functional requirements
- **Performance:** list/detail < 500ms P75 (cached reference data); digital proposal LCP < 2.5s.
- **Security:** OWASP ASVS L2, tenant isolation, encrypted secrets, audit log.
- **Accessibility:** WCAG 2.1 AA (fix green-on-white contrast, ARIA comboboxes, focus traps).
- **Reliability:** 99.9% uptime; async jobs for PDF/email with retries.
- **Scalability:** shared accommodations DB across tenants; horizontal API scaling.
- **i18n:** English v1; framework ready for FR/DE/ES quote output.

## 7. Success metrics
Time-to-first-quote, quote→booking conversion, weekly active consultants, proposals sent, median days-to-booking, storage per tenant, trial→paid add-on conversion.

## 8. Release scope
- **MVP (P0):** auth/tenancy, users, clients, requests+wizard, quote builder (all 4 steps) + PDF/digital publish, bookings, content library + accommodations (read/favorite), reference data, settings, profile.
- **v1.1 (P1):** insights, tasks/notes/flights/staff/vehicles depth, tour templates, email notifications, billing.
- **v2 (P2/P3):** add-on store, multi-language, white-label polish, traveler app, imports, audit log.

## 9. Risks & assumptions
- Seeding a credible **accommodations database** is the biggest data challenge (SafariOffice's is a moat) — plan a sourcing/ingestion strategy.
- PDF/digital rendering fidelity is central to perceived quality.
- Multi-currency pricing and margins require careful money handling (minor units, rounding).

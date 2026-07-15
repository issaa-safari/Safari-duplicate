# 10. Feature Inventory

Priority: **P0** = MVP core, **P1** = important, **P2** = later/differentiator, **P3** = nice-to-have/add-on.

| Feature | Description | Priority | Dependencies |
|---|---|---|---|
| Authentication | Email/password sign-in, bearer+refresh tokens, session | P0 | — |
| 2FA (TOTP) | Optional per-user two-factor | P1 | Auth |
| Multi-tenancy | Company isolation, per-tenant settings & subdomain | P0 | Auth |
| User management | Invite, roles (Admin/User/No-Access), lifecycle, seats | P0 | Auth, Multi-tenancy |
| Clients (CRM) | CRUD clients, search, pagination, requests rollup | P0 | Auth |
| Requests pipeline | Status board (New→…→Completed/Archive), counts, filters, sort, search | P0 | Clients |
| Add Request wizard | 2-step create (client + details), refno numbering | P0 | Requests, Reference data |
| Request detail | Sub-tabs: info, quotes, tour info, tasks, notes | P0 | Requests |
| Quote builder — day-by-day | Per-day itinerary (accommodation, activities, meals, options, transfers) | P0 | Requests, Accommodations, Content Library |
| Quote builder — pricing | Positions, rates, margins, currency, per-person tiers | P0 | Quote day-by-day |
| Quote builder — preview/edit | Rich text + images, digital preview | P0 | Pricing |
| Quote builder — finish/publish | Generate branded PDF + interactive digital page, versioning | P0 | Preview, Storage, Tenant subdomain |
| Send quote to client | Email delivery, open/sent tracking | P1 | Publish |
| Bookings | Convert quote → booking, booking value, confirmed version | P0 | Quotes |
| Tasks checklist | Per-request tasks (type/status/due), progress (n/total) | P1 | Requests |
| Notes | Per-request notes | P1 | Requests |
| Travelers | Per-request travelers (relation, age, dietary, allergies) | P0 | Requests |
| Flights | Per-request flight info | P1 | Requests |
| Tour staff / vehicles | Assign guides/drivers/vehicles to a booking | P1 | Content Library |
| Tour Templates | Reusable itineraries (draft/ready), copy/lock/share, seed quotes | P1 | Quote builder |
| Accommodations directory | Shared global DB, faceted filters, geo radius, list/map, favorites, premium | P0 | Content model, Maps/GIS |
| Content Library | Destinations, Activities, Themes, Countries, Vehicles, Tour Staff + media (images/covers/videos) | P0 | Storage |
| Reference data / enums | ~45 datasets with version-map caching; custom values | P0 | — |
| White-label labels | Tenant-editable UI terms (client/request/proposal…) | P2 | Multi-tenancy |
| Insights (analytics) | KPIs (requests, conversion, avg values, days-to-booking), source chart, date/user filters | P1 | Requests, Quotes, Bookings |
| System settings | Currencies, date formats, refno numbering, quote versioning, first-day-of-week | P0 | Multi-tenancy |
| Profile | Personal details, avatar, password, signature, notifications, progress | P0 | Auth |
| Notifications (email) | Event-based email prefs | P1 | Requests |
| Billing & subscriptions | Plans, seats, billing info | P1 | Multi-tenancy, Payments |
| Add-on store | Marketplace: Language Pack, SafariBuddy, Share Tours, Content Library | P2 | Billing |
| Multi-language quotes | Quote output in FR/DE/ES (Language Pack) | P2 | Quote builder, i18n |
| Traveler app (SafariBuddy) | Client-facing mobile app for booked trips | P3 | Bookings |
| Public digital proposal | Client-facing responsive proposal on tenant subdomain | P0 | Publish |
| PDF generation | Branded PDF proposals/vouchers | P0 | Publish, PDF service |
| Support widget | In-app support/feedback (Gleap-equivalent) | P3 | — |
| Analytics/telemetry | GA4/GTM/Hotjar-equivalent product analytics | P2 | — |
| Import (recommended new) | CSV client import, inbound-email request intake | P2 | Clients, Requests |
| Audit log (recommended new) | Track edits/status changes | P2 | — |

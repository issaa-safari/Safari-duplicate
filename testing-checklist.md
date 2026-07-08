# Testing Checklist

## Unit
- [ ] Refno generation across schemes (prefix/seq/year/last-name letters) and rollover.
- [ ] Pricing engine: unit_cost × qty, margin %, sell price, pax tiers, currency rounding (minor units).
- [ ] Quote versioning (`refno.N` increments; prior versions retained).
- [ ] Reference-data version bump on custom value add.
- [ ] Money/date/currency formatters per tenant settings.
- [ ] RBAC capability checks per role.

## Integration (API)
- [ ] Auth: signin, refresh rotation + reuse detection, signout, 2FA enable/verify/disable.
- [ ] Tenant isolation: user A cannot read/modify tenant B data (expect 404/403) — every module.
- [ ] Requests: create via wizard, status transitions, archive, delete blocked when quotes exist (409).
- [ ] Quotes: create, day-by-day CRUD, pricing gating (422 when itinerary empty), publish (202 + artifacts), send.
- [ ] Clients: pagination + search; auto-create during request add.
- [ ] Accommodations: facet filters + geo radius (PostGIS) correctness; favorites; premium.
- [ ] Reference: versions map + dataset fetch + ETag/caching.
- [ ] Insights: KPI math against seeded fixtures; include-archived toggle.
- [ ] File uploads: presigned flow, quota enforcement.

## E2E (Playwright)
- [ ] Login → board → add request (wizard both steps) → detail.
- [ ] Create quote → build 3-day itinerary → price → preview → finish → PDF + digital URLs.
- [ ] Send quote → mark Pre-Booked → Booked → booking view (travelers/flights/tasks).
- [ ] Accommodations: filter + radius + map + favorite.
- [ ] Content Library: create item + upload image (Description/Images/Covers/Videos tabs).
- [ ] Clients: add, search, edit, delete.
- [ ] Insights: change date range/user; values update.
- [ ] Settings: change currency/date format → reflected in a quote.
- [ ] Users: invite → lifecycle (waiting → active → cancel → reactivate).
- [ ] Public digital proposal renders (unauthed) on tenant subdomain; matches PDF.

## Accessibility
- [ ] WCAG 2.1 AA contrast (fix green-on-white for small text).
- [ ] Keyboard: full flows incl. combobox/day-builder/modals (focus traps, escape).
- [ ] Screen-reader labels/roles for autocompletes, tabs, tables, dialogs.
- [ ] axe-core automated pass on key pages; zero criticals.

## Non-functional
- [ ] Performance: list/detail P75 < 500ms (cached); proposal LCP < 2.5s; Lighthouse ≥ 90.
- [ ] Load: board/quote endpoints under concurrency; PDF worker throughput/backpressure.
- [ ] Security: OWASP top-10 (authz, IDOR/tenant leakage, XSS in rich text, SSRF in PDF renderer, upload validation), rate limiting, secret handling.
- [ ] Reliability: job retries/idempotency (PDF/email); graceful failures with typed errors.
- [ ] Data: migration up/down; seed reproducibility; backup/restore.

## Regression / visual
- [ ] Visual regression on digital proposal + PDF template.
- [ ] Snapshot of design-system components (Storybook + Chromatic or Playwright screenshots).

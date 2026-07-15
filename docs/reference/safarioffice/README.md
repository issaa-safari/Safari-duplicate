# SafariOffice — Platform Analysis & Implementation Blueprint

A complete, clean-room analysis of **app.safarioffice.com** (a SaaS for safari/tour operators) produced to support building an **original, functionally-equivalent** platform. No proprietary code, assets, or branding are reproduced — the design system is described, not copied.

- **Analyzed tenant:** Alamoudy Group (brand: *Safari Adventure Riders*), a Kenya/Tanzania operator, on the Free plan.
- **Method:** authenticated read-only crawl via Playwright (every page), API/network capture, DOM/computed-style inspection, and one throwaway test request used to exercise the quote builder (created as `ZZ-QA-TEST-DELETE`, then archived).
- **Target build stack:** Next.js (React) + NestJS (Node) + PostgreSQL.
- **Date:** 2026-07-08.

## What SafariOffice is (one paragraph)
SafariOffice is a vertical CRM + itinerary-and-quote builder for tour operators. Inbound trip **Requests** flow across a pipeline (New → Working On → Open → Pre-Booked → Booked → Completed / Not Booked / Archived). For each request an operator builds one or more **Quotes** using a day-by-day itinerary builder that pulls from a huge shared **Accommodations** database plus the operator's own **Content Library** (destinations, activities, themes, vehicles, staff). A finished quote is published as a branded **PDF** and interactive **Digital** proposal on a per-tenant subdomain, then confirmed into a **Booking**. Supporting modules: **Clients** (CRM), **Insights** (analytics), **Tour Templates** (reusable itineraries), user/billing/subscription **Settings**, and a paid **Add-on Store**.

## Document map → the 14 objectives
| # | Objective | Document |
|---|---|---|
| 1 | Information Architecture | [01-information-architecture.md](01-information-architecture.md) |
| 2 | User Flows | [02-user-flows.md](02-user-flows.md) |
| 3 | UI Components | [03-ui-components.md](03-ui-components.md) |
| 4 | Forms | [04-forms.md](04-forms.md) |
| 5 | Data Model + ERD | [05-data-model.md](05-data-model.md) |
| 6 | API Analysis | [06-api.md](06-api.md) |
| 7 | Authentication | [07-authentication.md](07-authentication.md) |
| 8 | UX Analysis | [08-ux-analysis.md](08-ux-analysis.md) |
| 9 | Visual Design System | [09-design-system.md](09-design-system.md) |
| 10 | Feature Inventory | [10-feature-inventory.md](10-feature-inventory.md) |
| 11 | Technical Stack | [11-tech-stack.md](11-tech-stack.md) |
| 12 | Build Specification | [specs/](specs/) — PRD, technical spec, DB schema, OpenAPI, components, folder structure, roadmap, sprint plan, testing checklist |
| 13 | Screenshots | [screenshots/](screenshots/) |
| 14 | Navigation Strategy | Documented inline in 01 & 02 (how the crawl traversed the app) |
| — | **Final blueprint** | [IMPLEMENTATION-BLUEPRINT.md](IMPLEMENTATION-BLUEPRINT.md) |

## Evidence appendix
Raw captures live in [network/](network/): API endpoint lists, sample response payloads (`req-*-list.json`, `versions.json`, `labeloverrides.json`), the add-request form spec, and stack fingerprints. These back the inferences in every document.

## Important caveats
- Entity/field names prefixed *inferred* are reconstructed from API payloads, DOM `data-name` attributes, and localStorage caches — they approximate the real schema, they are not the vendor's DDL.
- Add-on-gated features (Language Pack, SafariBuddy, Share Tours, Content Library storage tiers) were observed only from their store/upsell surfaces.
- All figures/counts reflect this single tenant at analysis time.

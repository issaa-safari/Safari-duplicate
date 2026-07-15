# 11. Technical Stack (inferred)

Confidence: **High** (direct evidence), **Medium** (strong indirect), **Low** (guess).

## 11.1 SafariOffice's actual stack (observed)
| Layer | Inference | Confidence | Evidence |
|---|---|---|---|
| Frontend runtime | jQuery (`$`), no SPA framework | **High** | `$` global, no React/Vue/Angular globals, server-rendered pages + fragments |
| Frontend assets | Custom `app.js?v=722`, `main.min.css?489`, Lottie | **High** | script/style tags |
| Routing | Hybrid: server routes + hash-based in-app routing | **High** | `#tab-*`, fragment loads, base64 `#filters=` |
| Backend | PHP, Laravel (or Laravel-like) | **High** | `XSRF-TOKEN` cookie, `csrf-token` meta, envelope style, `noindex` app |
| API | Separate REST service `api.safarioffice.com/internal/v1` | **High** | network capture |
| Auth | Bearer access token + refresh token, cookie-stored | **High** | `Authorization` required, `refresh_token` exposed header, `apitoken` cookie |
| Web server | nginx | **High** | `server: nginx` |
| Hosting region | EU, multiple web nodes | **High** | `x-server: so-eu-web1/4` |
| Database | Relational (MySQL/MariaDB likely for Laravel) | **Medium** | numeric PKs, `x-db-queries` header, Laravel convention |
| Caching | App-managed query/result cache + client localStorage version map | **High** | `x-cache-queries-*`, `versions` endpoint, localStorage |
| File/media storage | Object storage + per-tenant delivery subdomain `*.safarioffice.app` | **Medium** | PDF/digital URLs on tenant subdomain |
| PDF/digital rendering | Server-side generator | **Medium** | hashed `.pdf` + `/online` URLs |
| Maps/GIS | Geo radius search on accommodations | **Medium** | radius filters, map view, lat/lng |
| Analytics | GA4 (`G-TVTQQ7SK6F`), GTM (`GTM-W7TQLLJ`), Hotjar (`3023702`) | **High** | script tags/requests |
| Support/feedback | Gleap | **High** | SDK + `api.gleap.io` calls |
| Fonts | Google Fonts (Inter, Playfair Display) | **High** | stylesheet link |
| Monitoring | Custom perf headers; error tracker not confirmed | **Low** | `x-render-time`, `x-db-queries` |
| Payments | Provider for add-ons/subscriptions (not confirmed; no Stripe.js seen on pages visited) | **Low** | billing/add-on pages exist |

## 11.2 Recommended stack for the rebuild (chosen: Modern TS)
| Layer | Choice | Rationale |
|---|---|---|
| Frontend | **Next.js (React, App Router) + TypeScript** | SSR/SSG for public digital proposals + SPA-like app; strong ecosystem |
| UI | Tailwind + a headless component lib (Radix) or shadcn/ui | fast, accessible primitives; matches token approach in [09](09-design-system.md) |
| State/data | TanStack Query + Zustand (light) | server-cache + local UI state; mirrors the version-cache concept |
| Backend | **NestJS (Node, TypeScript)** REST API under `/api/v1` | modular, DI, guards for RBAC/tenancy |
| ORM/DB | **Prisma + PostgreSQL** (PostGIS for geo) | typed schema, migrations, geo radius queries |
| Auth | JWT access + rotating refresh (httpOnly cookies), TOTP 2FA | see [07](07-authentication.md) |
| Storage | S3-compatible (presigned uploads) + CDN | media & generated PDFs |
| PDF | Headless Chromium (Playwright/Puppeteer) or a PDF service | render digital → PDF from one template |
| Search/geo | Postgres FTS + PostGIS (or Meilisearch/Elastic later) | accommodations facets + radius |
| Jobs/queues | BullMQ (Redis) | PDF gen, email, imports |
| Email | Transactional provider (Postmark/SES) | notifications, quote delivery |
| Analytics | GA4/Plausible + PostHog | product analytics |
| Errors/monitoring | Sentry + OpenTelemetry | observability |
| Payments | Stripe (Billing + metered add-ons) | subscriptions/add-ons |
| Hosting | Vercel (web) + containerized API (Fly/Render/ECS) + managed Postgres/Redis | |
| Multi-tenant delivery | Wildcard subdomain `*.yourproposals.app` | client-facing proposals |

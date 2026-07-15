# Folder Structure (Turborepo monorepo)

```
safari-ops/
├─ apps/
│  ├─ web/                      # Next.js operator app (authenticated)
│  │  ├─ app/
│  │  │  ├─ (auth)/signin/
│  │  │  ├─ (app)/requests/            # board + [id] detail + add wizard
│  │  │  ├─ (app)/quote/[ids]/[section]/   # day-by-day|pricing|preview|finish
│  │  │  ├─ (app)/templates/
│  │  │  ├─ (app)/accommodations/
│  │  │  ├─ (app)/contentlibrary/[type]/[[...id]]/
│  │  │  ├─ (app)/clients/
│  │  │  ├─ (app)/insights/
│  │  │  └─ (settings)/{profile,users,company,billing,subscriptions,settings,addons}/
│  │  ├─ lib/ (api-client, auth, reference-cache, formatters)
│  │  └─ styles/ (tokens.css)
│  ├─ proposal/                 # Next.js public digital-proposal renderer (*.proposals.app)
│  │  └─ app/[slug]/            # SSR digital proposal; also source for PDF
│  └─ api/                      # NestJS API
│     ├─ src/
│     │  ├─ main.ts
│     │  ├─ common/ (guards: JwtGuard, TenantGuard, RolesGuard; interceptors: Envelope; filters: HttpError)
│     │  ├─ modules/
│     │  │  ├─ auth/  companies/  users/  clients/  requests/
│     │  │  ├─ quotes/ (day-by-day, pricing, publish submodules)
│     │  │  ├─ bookings/ travelers/ flights/ tasks/ notes/
│     │  │  ├─ templates/ accommodations/ content/ reference/
│     │  │  ├─ insights/ settings/ billing/ addons/ notifications/ files/
│     │  ├─ jobs/ (bullmq processors: pdf, email, import, thumbnails)
│     │  └─ prisma/ (schema.prisma, migrations, seed.ts)
│     └─ test/ (e2e)
├─ packages/
│  ├─ ui/                       # design system (@app/ui) + tokens
│  ├─ types/                    # shared TS types + zod schemas (from OpenAPI)
│  ├─ config/                   # eslint, tsconfig, tailwind preset
│  └─ api-client/               # generated typed client (openapi → ts)
├─ infra/                       # IaC, docker-compose (postgres+postgis, redis, minio), CI
├─ docs/                        # this analysis + specs
├─ turbo.json  package.json  pnpm-workspace.yaml
```

Conventions: shared types generated from `openapi.yaml`; feature-first modules in the API; colocated tests; environment via `.env` per app; Prisma as the single schema source of truth.

# Claims review — read before sending this profile to a client

Every factual statement in the profile traces to something in this repo or to a
decision you confirmed. Nothing was invented. This file records what is in,
what was deliberately left out, and the handful of things worth a second look.

## Deliberately left out

| Claim | Where it appears in the repo | Why it is not in the profile |
|---|---|---|
| "Founded in 2009" | `app/(public)/about/page.tsx` | You asked for no credibility numbers. It also contradicts the next item. |
| "Over the past 15 years" / "15+ Years" | `about/page.tsx`, `trust-strip.tsx`, `app/layout.tsx` metadata | Conflicts with 2009 (that would be 17 years). One of the two is wrong. |
| "over 500 travelers" | `about/page.tsx` | Hard-coded prose with no data behind it. The homepage's own code comment says "true claims only, no fabricated metrics". |
| Testimonials (Sarah M., Abdullah A., Elena & Marco) | `components/public/testimonials.tsx` | Static source strings with initial-only names, not a verified review feed. The brief forbids invented proof. **Send me real, attributable reviews and I'll add a testimonials page.** |
| Tanzania / Serengeti | site metadata, `lib/seo.ts` `areaServed` | Marketed in SEO copy, but the database holds **zero** Tanzanian destinations, parks, lodges or tours. Not demonstrable, so the profile leads with Kenya only. |
| Named hotels (Sarova properties) | `migrations/seed_05`, `seed_07` | Real supplier rate cards, but the brief forbids presenting hotels as partners. The profile describes accommodation by standard instead. |
| Prices | throughout | The repo's own figures conflict (visa assistance is $100 in `group_74_services.sql`, $50 in `seed_09`). A brand profile shouldn't carry a price list anyway — quoting is the conversation you want. |
| Motorcycle makes / models | — | None exist anywhere in the repo. "KTM-grade" on the website is a simile, not a fleet claim, so the profile describes riding without naming brands. |
| Arabic-speaking guide on-trip | — | You confirmed Arabic **planning and support**, not Arabic guiding. The profile says the former and never claims the latter. |

## In the profile — please confirm

These are stated as fact. All are sourced, but you are the one who can vouch for them.

1. **حد أقصى عشرة ضيوف** (max 10 guests) — from `components/public/trust-strip.tsx`.
   A service spec rather than a credibility metric, so I kept it. Say the word and it goes.
2. **عربون ٣٠٪** (30% deposit), balance before travel, bank transfer, USD — from
   `company_settings.deposit_percent` and the live proposal copy. Confirm this is still your standard.
3. **ترتيبات طعام حلال** (halal food arrangements) — you confirmed this; it is not established anywhere in the repo, so it rests on your word alone.
4. **خصوصية العائلة والنساء** (family/women's privacy) — same: confirmed by you, not in the repo.
5. **Inclusions / exclusions list** — from `lib/quote-defaults.ts`. The page says
   "عادةً" (typically) and defers to the individual quote, which matches how your quotes actually work.
6. **مرشدون وُلدوا ونشأوا في شرق أفريقيا** — from `app/(public)/about/page.tsx`.
7. **سيارة دعم ومساندة ميكانيكية، وتواصل على مدار الساعة** — from `trust-strip.tsx`.
8. **نسبة من كل رحلة تدعم مشاريع الحفاظ على البيئة** — from `about/page.tsx`. *Not currently
   printed* — tell me if you want the conservation commitment added; it's a genuine differentiator for this audience.

## Outstanding asset

**The logo file is low-resolution.** `assets/logo.png` is the website's own
`public/logo-safari-riders.png` at 181×256px. It renders fine on screen and in the
Instagram slides, but at cover size in print it is roughly 98 dpi and will look
soft. Commit a high-res PNG or SVG over it and re-run `node build.mjs` — the
palette re-derives from the new artwork automatically, so keep the same green.

## Separate issues worth fixing on the website

Found while researching, outside the scope of this profile:

- **`app/privacy/page.tsx` names the wrong company** — "Safari Adventure Tour" (singular,
  no "Riders") in the opening paragraph, the address block and the copyright line.
- **The privacy policy publishes a personal Gmail** (`issa.alamoudy1st@gmail.com`) as the
  contact address instead of `info@safariadventureriders.com`.
- **`company_settings.company_name` seeds as "Safari Adventure Tours"** (`migrations/group_00_base_schema.sql`),
  which is what invoices and quotes will print.
- **Bank details, registered address and all four cancellation bands are `NULL`** in
  `company_settings`, yet invoices, proposals and the client portal all render a
  "pay by bank transfer using the details below" block driven by those columns.
- **The website has no Arabic brand name.** العمودي للسياحة appears nowhere in the codebase
  even though it is on your stamp — worth adding to the Arabic site.

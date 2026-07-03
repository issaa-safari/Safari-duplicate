# TRIP MANAGEMENT SYSTEM → PLATFORM INTEGRATION BLUEPRINT (v2)
**Supersedes:** TRIP_SYSTEM_BLUEPRINT.md (v1, written before codebase review)
**Source systems:** TRIP_MANAGEMENT_SYSTEM.xlsm ⇢ safari-adventure-tour (Next.js 16 / Supabase / raw SQL migrations, currently at group_31)
**Audience:** Claude Code. Follow existing project conventions in `docs/write-path-integrity-spec.md` §Guardrails.

---

## 0. KEY FINDING — what the platform already solves

The v1 blueprint proposed a schema from scratch. The codebase review shows the quote builder (groups 12–19) already implements a model **superior to both the xlsm and the v1 proposal**. Do NOT create parallel tables. Map onto what exists:

| xlsm concept | v1 proposal | ✅ Already in platform |
|---|---|---|
| Manual Quotation No (defect D1) | quotation_number seq | `generate_quote_number()` + `quote_number_seq` → `SAT-Q-00001` |
| Hotel/Transport/Park pricing sheets with seasons (D2) | separate rate tables | `supplier_rate_cards` (valid_from/valid_to, polymorphic entity) + `supplier_rates` |
| Children billed as adults (D4) | child_rate_pct | `traveller_age_bands` (Infant free / Child 50% / Adult 100%) + per-traveller overrides |
| KES stranded, no FX (D5) | fx_rates table | per-line `source_currency` + `exchange_rate_to_usd` + `exchange_rates_snapshot` on version |
| Input scratchpad overwritten (D11) | append-only posting | `quote_versions` immutable snapshots, `superseded` status |
| Park category/residency (D3, partial) | park_rates table | `supplier_rates.residency` ('all','resident','non_resident','citizen') + `traveller_category`; `parks` table (group_15) |
| Manual price typing bypassing rates | read-only resolved price | price lines keep `original_unit_cost_usd`, `is_manual_override`, `override_reason` — override allowed but audited (better) |
| Customer receipts (Receipts sheet) | transactions table | `quote_payments` (group_14) incl. `mpesa` method |
| No sale-vs-cost margin discipline | margin fields | `default_markup_percent`, `category_markup_overrides`, `gross_margin_usd/percent` |

**Conclusion:** the remaining work is 5 gaps (G1–G5 below), not a rebuild.

---

## 1. GAP REGISTER — what the xlsm does that the platform doesn't yet

### G1 — Dual-track quoting (Standard vs Premium) ⚠️ core xlsm workflow
The workbook prices every trip twice: Low-Budget hotels and Premium hotels sharing the same transport + park costs, presented side by side (`Q32` vs `Q33`), with a sale price per track. The platform's `quote_versions` are single-track.

**Decision (recommended): model tracks as sibling versions + a comparison surface — no schema fork.**
```sql
-- migration group_32_quote_tracks.sql
alter table quote_versions
  add column if not exists track_label text
    check (track_label is null or track_label in ('standard','premium')),
  add column if not exists compare_group uuid;  -- versions sharing this id are one proposal
create index if not exists quote_versions_compare_idx on quote_versions (compare_group)
  where compare_group is not null;
```
Behavior:
- "Duplicate as Premium track" action on a version: deep-copies days/items/price lines, keeps transport + park_fees + activities lines identical (same `compare_group`), lets the user swap only `accommodation` lines.
- Quote document (client PDF/page) renders both tracks' per-person prices when a `compare_group` has 2 versions.
- On acceptance, client (or admin) accepts ONE version → the sibling gets status `superseded`. `quotes.accepted_version_id` already handles this.
- **Payables rule the xlsm got wrong:** only the accepted version's accommodation lines are supplier liabilities. Never both.

### G2 — Automatic season-aware rate resolution
`supplier_rate_cards` carry seasons, and `rate-picker.tsx` already asks for a "Season date" — but the date is manually chosen (defaults to *today*, not the travel date), and resolution is a manual lookup per line. The xlsm defects D2/D3 (rates ignored → NA/0) survive in a milder form: wrong-season rates if the user doesn't change the date.

**Build `lib/rate-resolution.ts`:**
```ts
export interface ResolveRateParams {
  entityType: EntityType            // 'accommodation' | 'vehicle' | 'park_fee' | ...
  entityId: string
  serviceDate: string               // the quote_day date — NOT today
  travellerCategory?: string        // 'adult' | 'child' | 'infant'
  roomCategory?: string             // 'sharing' | 'single' | 'triple' | ...
  residency?: 'all' | 'resident' | 'non_resident' | 'citizen'
}

export interface ResolvedRate {
  rateCardId: string
  supplierRateId: string
  sourceCurrency: string
  sourceUnitCost: number
  exchangeRateToUsd: number         // from exchange_rates_snapshot or live table
  unitCostUsd: number
  pricingUnit: PricingUnit
  seasonName: string | null
}

// Rules:
// 1. Filter cards: entity match, is_active, valid_from <= serviceDate <= valid_to.
// 2. Filter rates: residency (exact > 'all'), traveller_category (exact > null),
//    room_category (exact > null), group size window.
// 3. Specificity wins; ties broken by sort_order.
// 4. ZERO matches → typed RateGapError { entity, date } surfaced as a blocking
//    UI warning on the price line — never silent 0 (this is xlsm defect D2/D3).
// 5. Multi-night accommodation crossing a season boundary → split into one
//    price line per season segment, quantity = nights in segment.
// 6. Vehicles: rental days = (end − start) + 1 INCLUSIVE (xlsm D13 — confirm with ops).
```
Wire-in points:
- `rate-picker.tsx`: default `date` to the relevant `quote_days.day_date` (or `travel_start_date`), not `new Date()`.
- New "Auto-price day" / "Auto-price version" server action: walk `quote_day_items`, resolve each, insert price lines via existing `calculateLineTotals`.
- Add `vitest` cases: season boundary split, child %, citizen KES park fee → USD conversion, RateGapError path.

### G3 — Supplier side of finance (payables) + reports
`quote_payments` covers money IN only. The xlsm's Payment sheet, Receivable & Payable, P&L and Balance Sheet have no platform equivalent. group_14 says "no double-entry ledger yet" — keep that scoping; ship a v1 payables mirror now, defer full double-entry.

```sql
-- migration group_33_supplier_finance.sql
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  supplier_type text not null default 'other'
    check (supplier_type in ('accommodation','transport','park','activity','staff','other')),
  contact_email text, contact_phone text, notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Link rate cards to real suppliers (today supplier_name is free text — xlsm defect D8)
alter table supplier_rate_cards
  add column if not exists supplier_id uuid references suppliers(id) on delete set null;

create table if not exists supplier_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete restrict,
  quote_id uuid references quotes(id) on delete set null,   -- optional allocation
  amount_usd numeric(12,2) not null check (amount_usd > 0),
  method text check (method in ('bank_transfer','card','cash','mpesa','cheque','other')),
  reference text, notes text,
  paid_at date not null default current_date,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists supplier_payments_supplier_idx on supplier_payments (supplier_id);
```
**Payable per supplier** (view or query): sum of `total_cost_usd` of price lines on **accepted** versions whose `rate_card_id → supplier_id` matches, minus `supplier_payments`. Excludes non-accepted sibling tracks (G1 rule).

**P&L v1** (replaces the xlsm's broken sheet, D6): for a date range over accepted versions —
`revenue = Σ total_selling_usd`, `direct_costs = Σ total_cost_usd`, `gross = revenue − costs`; overheads from a simple `expenses` table (same shape as supplier_payments, minus supplier link) if/when needed. Balance-sheet & double-entry stay deferred per group_14's note.

### G4 — Kenya masters: parks + Sarova rates seed (xlsm defect D12 cleanup)
- `parks.country` defaults to `'Tanzania'` — seed the Kenya set with `country='Kenya'`: Mara Conservancy (conservancy), Ol Pejeta (conservancy), Lake Nakuru NP, Amboseli NP, Hell's Gate NP…
- Seed `suppliers`: Sarova Hotels, vehicle suppliers A–D (get real names), park authorities (KWS, Mara Conservancy).
- Seed `supplier_rate_cards`/`supplier_rates` from the xlsm masters with cleanup:
  - `Narobi→Nairobi`, `Symara→Masai Mara` (confirm), `Luxury plus canps→luxury_plus`, strip the `1Non-Residents` typo into a proper Jul–Dec season row.
  - Hotel Pricing SGL/TWIN/3rd-bed-supp columns → `supplier_rates` rows keyed by `room_category` ('single','sharing','extra_bed') with `pricing_unit='night'`... TWIN is a per-room double rate in the sheet — store per-room with `pricing_unit='room'` or divide to per-person; pick ONE convention and document it in the seed file header.
  - Park fees: `residency` + `traveller_category` + season rows; citizen rates in `source_currency='KES'`.
  - Transport: Landcruiser 230 / Sedan 80 / Overlanding Truck 400 / Flight 500 USD per day → `pricing_unit='day'`.
- Ship as `seed_05_kenya_suppliers_rates.sql` following existing seed file style.

### G5 — Historical data migration (optional, last)
`scripts/migrate-xlsm.ts`: group Data-sheet rows by Quotation No (dedupe — the log has repeated posts, D11), create `clients` via the hardened resolver in `lib/server/clients.ts`, one quote + accepted version each, price lines from the four blocks, `quote_payments` from Receipts rows 5+, `supplier_payments` from Payment rows 5+. Historical rows get `internal_notes='migrated from xlsm'`.

---

## 2. BUILD SEQUENCE FOR CLAUDE CODE

1. **group_32_quote_tracks.sql** + duplicate-as-track server action + comparison rendering on the client quote page (G1).
2. **lib/rate-resolution.ts** + tests + rate-picker date fix + auto-price actions (G2). No schema change.
3. **group_33_supplier_finance.sql** + suppliers admin CRUD + payables report page + P&L v1 page (G3).
4. **seed_05_kenya_suppliers_rates.sql** (G4) — needs the ops confirmations below first.
5. **scripts/migrate-xlsm.ts** (G5) — only after 1–4 are stable.

Keep: existing guardrails (RLS posture per group_30/31, snapshot pattern, client resolver), `currency='USD'` check on quote_versions (per-line FX already handles KES), vitest for all pricing math.

## 3. CONFIRM WITH OPS BEFORE SEEDING
- `Symara` = Masai Mara?
- TWIN rate = per room (double) — store per-room or per-person?
- Vehicle rental days inclusive of end date?
- Real vehicle supplier names behind codes A–D.
- Child park-fee ages (xlsm says 9–17) vs platform Child band (3–15) — align `traveller_age_bands` or add park-specific bands.

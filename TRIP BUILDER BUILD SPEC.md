# Trip Builder & Finance Rebuild — Final Build Spec
**Project:** safari-adventure-tour (Next.js 16 / Supabase, migrations at group_31)
**Goal:** Recreate the Excel TRIP_MANAGEMENT_SYSTEM workflow inside the platform — the single-screen quoting experience shown in the Input sheet — plus the finance features the platform is missing. Reuse the existing quote builder schema; do not build parallel tables.
**Companion:** TRIP_SYSTEM_INTEGRATION_BLUEPRINT.md (gap analysis G1–G5). This spec turns it into pages, actions, and migrations.

---

## A. THE TARGET WORKFLOW (from the Excel Input sheet)

One screen, one save. The operator builds an entire trip quote top-to-bottom without leaving the page:

```
┌─ 1. GUEST DETAILS ────────────────────────────────────────────────┐
│ Guest name | Adults | Children | Trip start | Trip end | Days(auto)│
├─ 2. HOTELS — STANDARD track (repeating rows) ─────────────────────┤
│ Location ▾ → Budget ▾ → Hotel ▾ → Room ▾ | Occupancy ▾ | Meal ▾  │
│ Check-in | Check-out | Nights(auto) | /night(auto) | Total(auto)  │
├─ 3. HOTELS — PREMIUM track (same columns) ────────────────────────┤
├─ 4. TRANSPORT (repeating rows) ───────────────────────────────────┤
│ Vehicle ▾ | Rate/day(auto) | Start | End | Days(auto) | Total(auto)│
├─ 5. PARK FEES (repeating rows) ───────────────────────────────────┤
│ Park ▾ | Category ▾ | Group ▾ | Entry date | Rate(auto) | Tickets │
├─ 6. LIVE SUMMARY ─────────────────────────────────────────────────┤
│           Hotels    Transport   Parks    TOTAL COST   Per guest   │
│ Standard  3,756      320         X        4,076        1,359      │
│ Premium     340      320         X          660          220      │
│ SALE PRICE Standard [ 500 ]  Premium [ 600 ]  → margin shown live │
├─ 7. [ SAVE QUOTE ] ───────────────────────────────────────────────┤
└───────────────────────────────────────────────────────────────────┘
```

Rules carried over from Excel, corrected:
- **Auto-priced fields are read-only.** Rates resolve from `supplier_rate_cards`/`supplier_rates` by the SERVICE DATE (check-in / entry date), never today's date, never typed by hand. Manual override goes through the existing audited override path (`is_manual_override`, `override_reason`).
- **No silent zeros.** A missing rate renders a red "No rate for {entity} on {date}" chip on the row and blocks Save — this is the fix for the Excel park-fee NA→0 bug.
- **Children priced by age band** (`traveller_age_bands`), not divided equally.
- **KES rates** (citizen park fees) convert per line via `exchange_rate_to_usd`; summary shows USD and KES.
- **Days conventions:** hotel nights = checkout − checkin; vehicle days = end − start + 1 (inclusive).
- Save is idempotent: saving a draft again updates it, never duplicates (fixes the Excel repost duplication).

## B. DATA MAPPING — trip builder → existing schema

| Builder section | Writes to |
|---|---|
| Guest details | `clients` (via `lib/server/clients.ts` resolver), `quotes`, `quote_versions.travel_start/end_date`, `quote_travellers` (one per adult/child with age band) |
| Standard hotel rows | `quote_versions` #1 (`track_label='standard'`) → `quote_days` + `quote_day_items` (accommodation) + `quote_price_lines` (cost_category accommodation) |
| Premium hotel rows | sibling `quote_versions` #2 (`track_label='premium'`, same `compare_group`) — accommodation lines differ, all other lines cloned |
| Transport rows | price lines cost_category transport on BOTH versions (identical) |
| Park rows | price lines cost_category park_fees on BOTH versions (identical) |
| Sale prices | per version: derive `default_markup_percent` from sale price, or store sale as `total_selling_usd` with markup back-computed; margin fields already exist |
| SAVE QUOTE | one transactional server action: upsert quote + both versions + lines |

The quote document sent to the client renders BOTH tracks (per-person price each) when `compare_group` has two versions; client accepts one; sibling → `superseded`.

## C. MIGRATIONS

### group_32_quote_tracks.sql (G1)
```sql
alter table quote_versions
  add column if not exists track_label text
    check (track_label is null or track_label in ('standard','premium')),
  add column if not exists compare_group uuid;
create index if not exists quote_versions_compare_idx
  on quote_versions (compare_group) where compare_group is not null;
```

### group_33_supplier_finance.sql (G3)
```sql
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  supplier_type text not null default 'other'
    check (supplier_type in ('accommodation','transport','park','activity','staff','other')),
  contact_email text, contact_phone text, notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table supplier_rate_cards
  add column if not exists supplier_id uuid references suppliers(id) on delete set null;

create table if not exists supplier_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete restrict,
  quote_id uuid references quotes(id) on delete set null,
  amount_usd numeric(12,2) not null check (amount_usd > 0),
  method text check (method in ('bank_transfer','card','cash','mpesa','cheque','other')),
  reference text, notes text,
  paid_at date not null default current_date,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists supplier_payments_supplier_idx on supplier_payments (supplier_id);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null default 'other'
    check (category in ('salaries','rent','fuel','marketing','office','maintenance','other')),
  description text not null,
  amount_usd numeric(12,2) not null check (amount_usd > 0),
  method text check (method in ('bank_transfer','card','cash','mpesa','cheque','other')),
  reference text,
  created_by uuid,
  created_at timestamptz not null default now()
);
```
Follow the project's RLS posture from group_30/31 for all new tables.

### seed_05_kenya_suppliers_rates.sql (G4)
Kenya parks (`country='Kenya'`): Mara Conservancy, Ol Pejeta, Lake Nakuru NP, Amboseli NP. Suppliers: Sarova Hotels, park authorities, vehicle suppliers (real names TBC). Sarova rate cards from the workbook masters with season dates, meal plans, SGL/TWIN/3rd-bed rows; park fee rates with residency/traveller_category/season and citizen rates in KES; transport day rates (Landcruiser 230, Sedan 80, Overlanding Truck 400, Flight 500 USD). Clean the known typos (Narobi→Nairobi, Symara→Masai Mara, "1Non-Residents"→ non_resident Jul–Dec season row).

## D. NEW CODE

### 1. lib/rate-resolution.ts (G2) — pure functions + vitest
- `resolveRate(params)` per blueprint §G2: filter cards by entity + `valid_from<=serviceDate<=valid_to` + active; filter rates by residency/traveller_category/room_category specificity; zero matches → throw `RateGapError` (never return 0).
- `priceAccommodationStay()` — splits stays crossing a season boundary into one line per season segment.
- `priceVehicleHire()` — inclusive days.
- `pricePark()` — per ticket × count, KES→USD via snapshot rate.
- Reuse `calculateLineTotals` for markup math.
- Tests: season split, child band %, KES conversion, RateGapError, inclusive days.

### 2. Trip Builder page — `app/admin/trip-builder/page.tsx` (+ `[quoteId]` for editing drafts)
Client component implementing layout §A. Details:
- Cascading selects: Location → budget tier → hotel (accommodations filtered) → room type; vehicle list from `vehicles`; parks from `parks` (Kenya). Server-filtered via existing admin search/lookup endpoints or new light lookup routes.
- Each row calls a `resolve-rate` server action on completion of (entity, date, occupancy) → fills read-only price cells; failures render the rate-gap chip.
- Live summary recomputes client-side from row state; sale price inputs per track show margin (sale − cost) and per-guest figures instantly.
- Save → `saveTrip` server action (§D3). After save: toast + link to the quote detail page; builder stays editable (draft status).
- Keyboard-friendly: Enter adds a row within a section (matches spreadsheet muscle memory).

### 3. Server action `saveTrip` — single transaction
1. Resolve/create client (existing resolver).
2. Upsert `quotes` row (new or existing draft).
3. Upsert two `quote_versions` (standard/premium) sharing a fresh or existing `compare_group`; write travel dates, travellers, sale-price-derived selling totals.
4. Rebuild `quote_days` (one per trip date), `quote_day_items`, `quote_price_lines` for each version — accommodation lines per track, transport/park lines duplicated to both.
5. Recompute version totals (`total_cost_usd`, `total_selling_usd`, margins, per-person prices) server-side; never trust client math.
6. All-or-nothing; safe to re-run (delete-and-rewrite lines for draft versions only; locked/sent versions are immutable — create a new version instead, existing convention).

### 4. Finance pages (replace Excel Payment / Receipts / R&P / P&L sheets)
- `app/admin/finance/receipts` — customer payments: list + record against a quote (`quote_payments`, exists). Show invoiced (accepted version selling total), received, balance. Validate received ≤ invoiced.
- `app/admin/finance/payables` — NEW: per-supplier table — owed (Σ `total_cost_usd` of ACCEPTED versions' lines whose rate card → supplier), paid (Σ `supplier_payments`), balance; drill-down per quote; record payment.
- `app/admin/finance/expenses` — NEW: simple expense log CRUD.
- `app/admin/finance/pnl` — NEW: date-range P&L — revenue (Σ selling of accepted versions in range), direct costs (Σ cost of same), gross margin, expenses by category, net. USD with KES equivalent at current rate.
- `app/admin/suppliers` — NEW: supplier CRUD + link picker on rate-card form.
- Dashboard additions: AR balance, AP balance, monthly gross margin, quotes issued vs accepted.

### 5. Quote document (client-facing)
Update the quote page/PDF to render dual-track pricing when `compare_group` has 2 versions: "Standard package $X per person / Premium package $Y per person", shared itinerary, per-track hotel list, inclusions/exclusions (existing fields). Accept flow (existing `quote/accept`) accepts one version; mark sibling `superseded`.

## E. ACCEPTANCE CRITERIA
1. Recreate the workbook's test trip (2 adults + 1 child, 23–30 Dec, SWBRS 3 nts HB standard / SIHK 1 nt BB premium, Sedan 23–27 Dec, Mara + Ol Pejeta entries) end-to-end on the Trip Builder; totals match the corrected math and park fees are non-zero real rates (not NA/0).
2. Saving twice produces one quote, not two.
3. Deleting the Sarova Dec rate card and re-pricing shows a blocking rate-gap error, not 0.
4. Accepting the premium version leaves only premium accommodation costs in payables.
5. P&L for December shows the accepted version's revenue/cost only.
6. `npm test` green including new rate-resolution suite; lint clean.

## F. BUILD ORDER
1. group_32 migration + rate-resolution lib + tests
2. Trip Builder page + saveTrip action
3. group_33 + suppliers CRUD + payables/receipts/expenses/P&L pages
4. Dual-track quote document + accept flow update
5. seed_05 Kenya data
6. Dashboard tiles

## G. OPS CONFIRMATIONS NEEDED (blockers for step 5 only)
- "Symara" = Masai Mara? | TWIN rate stored per-room or per-person? | Vehicle days inclusive? | Real supplier names A–D | Park child ages 9–17 vs platform Child band 3–15.

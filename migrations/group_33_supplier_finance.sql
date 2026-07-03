-- Group 33: Supplier-side finance — suppliers, supplier payments, expenses
-- Run in Supabase SQL Editor after Group 32.
--
-- Adds:
--   * suppliers — real supplier records (rate cards' supplier_name was free text).
--   * supplier_rate_cards.supplier_id — links each rate card to a supplier so
--     payables can attribute accepted-version costs to who is owed.
--   * supplier_payments — money OUT to suppliers (quote_payments is money IN).
--   * expenses — simple overhead log for the P&L (salaries, rent, fuel, …).
--   * company_settings.usd_to_kes_rate — the single KES display/conversion rate
--     (editable in Settings; snapshotted per quote version at save time).
--
-- RLS: group_31 Category 2 — RLS enabled with no policies. anon/authenticated
-- are fully locked out; access is via the service-role client only.

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
create index if not exists expenses_date_idx on expenses (expense_date);

alter table company_settings
  add column if not exists usd_to_kes_rate numeric(10,4) not null default 129
    check (usd_to_kes_rate > 0);

create index if not exists supplier_rate_cards_supplier_idx
  on supplier_rate_cards (supplier_id) where supplier_id is not null;

-- Service-role-only lockout (group_31 Category 2): RLS on, zero policies.
alter table suppliers enable row level security;
alter table supplier_payments enable row level security;
alter table expenses enable row level security;

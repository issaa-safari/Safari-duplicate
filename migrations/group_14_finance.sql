-- Finance: payment recording against accepted quotes
-- v1 simplified model (no double-entry ledger yet)

create table if not exists quote_payments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete restrict,
  amount_usd numeric(12,2) not null check (amount_usd > 0),
  payment_type text not null default 'deposit'
    check (payment_type in ('deposit', 'balance', 'full', 'partial', 'refund')),
  method text null
    check (method in ('bank_transfer', 'card', 'cash', 'mpesa', 'cheque', 'other')),
  reference text null,
  notes text null,
  received_at date not null default current_date,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists quote_payments_quote_idx on quote_payments (quote_id);

alter table quote_payments disable row level security;

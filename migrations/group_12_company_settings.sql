-- Group 12: Company Settings (single-row table)
-- Run in Supabase SQL Editor

create table if not exists company_settings (
  id                  integer primary key default 1 check (id = 1),  -- enforces single row
  company_name        text not null default 'Safari Adventure Tour',
  contact_email       text,
  phone               text,
  whatsapp            text,
  default_deposit_pct integer not null default 30,
  usd_to_kes_rate     numeric(10,2) not null default 130.00,
  updated_at          timestamptz not null default now()
);

-- Seed the single row if it doesn't exist
insert into company_settings (id)
values (1)
on conflict (id) do nothing;

-- Group 70: WhatsApp Flow leads
--
-- Captures completed WhatsApp Flow intake submissions. The Flow's final
-- `nfm_reply` message is parsed by app/api/webhooks/whatsapp/route.ts and
-- inserted here (via the service-role client, which bypasses RLS). A lead is a
-- lightweight top-of-funnel record — distinct from `clients`/`requests`, which
-- an admin promotes it into once qualified.
--
-- Idempotent — safe to re-run. Run after group_69.

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  phone_number text,                                 -- WhatsApp wa_id (msg.from)
  full_name text,
  email text,
  preferred_language text not null default 'en'
    check (preferred_language in ('en', 'ar')),

  tour_type text,
  travel_dates text,                                 -- free text from the Flow
  group_size text,
  budget_range text,
  special_requests text,

  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'converted', 'archived')),
  source text not null default 'whatsapp_flow'
);

create index if not exists idx_leads_created_at on leads(created_at desc);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_phone_number on leads(phone_number);

drop trigger if exists update_leads_updated_at on leads;
create trigger update_leads_updated_at before update on leads
  for each row execute function update_updated_at_column();

-- ── RLS: admin-manage only (webhook inserts run through the service role) ────
alter table leads enable row level security;

drop policy if exists "Admins can manage leads" on leads;
create policy "Admins can manage leads" on leads
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

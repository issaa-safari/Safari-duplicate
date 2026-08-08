-- Group 76: invoices
--
-- `trip_payments` (group_73) records money that arrived. Nothing recorded what
-- was *asked for*: the balance screens infer it from the accepted quote version's
-- selling total, which is an internal figure that can move after the client has
-- agreed to a price, and which knows nothing about the add-on services group_74
-- attaches outside the itinerary. An invoice is the missing half — a document
-- that fixes what a client owes at a moment in time and does not move afterwards.
--
-- `invoices` already exists as a two-column stub from group_00 (id, created_at),
-- never written to by anything. This file fills it in rather than creating a
-- second table under another name, so `alter table ... add column if not exists`
-- throughout.
--
-- Three decisions worth stating, because they are not the obvious ones:
--
--   * **Paid is not a status.** The status column is draft / issued / void only.
--     Whether an invoice is settled is derived from the ledger at read time by
--     lib/balance.ts, exactly as every other money figure in the app is. A
--     stored `paid` flag is a second copy of the truth, and the six divergent
--     balance calculations group_73 replaced are what that costs.
--
--   * **Lines are the invoice.** `invoices.total_usd` is maintained by a trigger
--     over `invoice_lines`, so the header can never disagree with its detail.
--     Discounts are negative lines, which is why `unit_price_usd` here has no
--     `>= 0` check — unlike `trip_services.unit_price_usd`, which does.
--
--   * **An issued invoice is frozen.** Its lines reject writes and its header
--     rejects edits to anything financial. Correcting an issued invoice means
--     voiding it and issuing another, which is what leaves an audit trail.
--
-- Numbers are drawn from a sequence at issue time, not at creation, so an
-- abandoned draft does not burn one and the issued numbers stay contiguous. The
-- prefix comes from company_settings.invoice_prefix, which the admin already
-- exposes but nothing consumed until now.
--
-- Idempotent — safe to re-run. Run after group_75.

-- ── The invoice header ──────────────────────────────────────────────────────

alter table invoices add column if not exists quote_id uuid references quotes(id) on delete restrict;
alter table invoices add column if not exists booking_id uuid references bookings(id) on delete restrict;

alter table invoices add column if not exists invoice_number text;
alter table invoices add column if not exists status text not null default 'draft';

alter table invoices add column if not exists issue_date date;
alter table invoices add column if not exists due_date date;

-- Snapshotted at issue: the client record can be edited, renamed or merged
-- afterwards, and a document that quietly re-addresses itself is not a document.
alter table invoices add column if not exists client_id uuid references clients(id) on delete set null;
alter table invoices add column if not exists client_name text;
alter table invoices add column if not exists client_email text;
alter table invoices add column if not exists client_address text;

alter table invoices add column if not exists currency text not null default 'USD';
-- Maintained by sync_invoice_total() below. Never write it directly.
alter table invoices add column if not exists total_usd numeric(12,2) not null default 0;

alter table invoices add column if not exists notes text;
alter table invoices add column if not exists terms text;

alter table invoices add column if not exists issued_at timestamptz;
alter table invoices add column if not exists voided_at timestamptz;
alter table invoices add column if not exists void_reason text;

alter table invoices add column if not exists created_by uuid;
alter table invoices add column if not exists updated_at timestamptz not null default now();

-- Constraints, added separately because `add constraint` has no IF NOT EXISTS.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_trip_ref_chk') then
    alter table invoices add constraint invoices_trip_ref_chk
      check (quote_id is not null or booking_id is not null);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'invoices_status_chk') then
    alter table invoices add constraint invoices_status_chk
      check (status in ('draft', 'issued', 'void'));
  end if;

  -- An issued invoice always has a number and a date; a draft never has a
  -- number. This is what keeps the sequence honest, and it is also why a draft
  -- is deleted rather than voided — there is nothing yet to keep a record of.
  if not exists (select 1 from pg_constraint where conname = 'invoices_issued_shape_chk') then
    alter table invoices add constraint invoices_issued_shape_chk
      check (
        (status = 'draft' and invoice_number is null)
        or (status in ('issued', 'void') and invoice_number is not null and issue_date is not null)
      );
  end if;
end $$;

create unique index if not exists invoices_number_uniq
  on invoices (invoice_number) where invoice_number is not null;

create index if not exists invoices_quote_idx on invoices (quote_id);
create index if not exists invoices_booking_idx on invoices (booking_id);
create index if not exists invoices_client_idx on invoices (client_id);
create index if not exists invoices_status_idx on invoices (status);
create index if not exists invoices_due_idx on invoices (due_date) where status = 'issued';

drop trigger if exists update_invoices_updated_at on invoices;
create trigger update_invoices_updated_at before update on invoices
  for each row execute function update_updated_at_column();

-- ── The lines ───────────────────────────────────────────────────────────────

create table if not exists invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,

  description_en text not null,
  description_ar text,

  quantity numeric(10,2) not null default 1 check (quantity <> 0),
  -- Deliberately unchecked: a discount is a negative line, and a credit note is
  -- an invoice made entirely of them.
  unit_price_usd numeric(12,2) not null default 0,
  total_usd numeric(12,2)
    generated always as (round(quantity * unit_price_usd, 2)) stored,

  -- Where the line came from, so a regenerated draft can tell an operator's
  -- hand-typed line from one it produced itself.
  kind text not null default 'other'
    check (kind in ('trip', 'service', 'discount', 'other')),
  -- set null, not cascade: removing an add-on from a trip must not silently
  -- alter an invoice that already charged for it.
  trip_service_id uuid references trip_services(id) on delete set null,

  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_lines_invoice_idx on invoice_lines (invoice_id, sort_order);
create index if not exists invoice_lines_trip_service_idx on invoice_lines (trip_service_id);

drop trigger if exists update_invoice_lines_updated_at on invoice_lines;
create trigger update_invoice_lines_updated_at before update on invoice_lines
  for each row execute function update_updated_at_column();

-- ── Payments point at the invoice they settle ───────────────────────────────
--
-- Nullable, and stays nullable: money can arrive before an invoice is raised,
-- and a trip's deposit is often taken at acceptance. `on delete set null` so a
-- deleted draft never takes a receipt with it.

alter table trip_payments add column if not exists invoice_id uuid
  references invoices(id) on delete set null;

create index if not exists trip_payments_invoice_idx on trip_payments (invoice_id);

-- ── Numbering ───────────────────────────────────────────────────────────────

create sequence if not exists invoice_number_seq;

create or replace function next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
begin
  select coalesce(nullif(btrim(invoice_prefix), ''), 'INV')
    into v_prefix
    from company_settings
    order by created_at
    limit 1;

  return coalesce(v_prefix, 'INV') || '-' || lpad(nextval('invoice_number_seq')::text, 4, '0');
end;
$$;

-- ── Issuing ─────────────────────────────────────────────────────────────────
--
-- Everything an issue needs — number, dates — is filled in here rather than by
-- the caller, so an invoice issued from a server action, a script or the SQL
-- editor comes out the same shape. Due date follows
-- company_settings.balance_due_days, which the settings screen already edits.

create or replace function assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_due_days integer;
begin
  if new.status = 'issued' and (tg_op = 'INSERT' or old.status <> 'issued') then
    new.invoice_number := coalesce(new.invoice_number, next_invoice_number());
    new.issued_at      := coalesce(new.issued_at, now());
    new.issue_date     := coalesce(new.issue_date, current_date);

    if new.due_date is null then
      select coalesce(balance_due_days, 30) into v_due_days
        from company_settings order by created_at limit 1;
      new.due_date := new.issue_date + coalesce(v_due_days, 30);
    end if;
  end if;

  if new.status = 'void' and (tg_op = 'INSERT' or old.status <> 'void') then
    new.voided_at := coalesce(new.voided_at, now());
  end if;

  -- A void invoice keeps its number and its lines; what it loses is the claim
  -- on the client, so it must not be counted as owed anywhere.
  return new;
end;
$$;

drop trigger if exists assign_invoice_number_trigger on invoices;
create trigger assign_invoice_number_trigger before insert or update on invoices
  for each row execute function assign_invoice_number();

-- ── Totals ──────────────────────────────────────────────────────────────────
--
-- The header is derived from the lines and never written by hand, so the two can
-- not drift. Statement-level would be cheaper, but a row trigger keeps the
-- moved-between-invoices case (rare, but silent if missed) correct.

create or replace function sync_invoice_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.invoice_id is not null then
    update invoices
       set total_usd = (select coalesce(sum(total_usd), 0) from invoice_lines where invoice_id = old.invoice_id)
     where id = old.invoice_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.invoice_id is not null then
    update invoices
       set total_usd = (select coalesce(sum(total_usd), 0) from invoice_lines where invoice_id = new.invoice_id)
     where id = new.invoice_id;
  end if;

  return null;
end;
$$;

drop trigger if exists sync_invoice_total_trigger on invoice_lines;
create trigger sync_invoice_total_trigger
  after insert or update or delete on invoice_lines
  for each row execute function sync_invoice_total();

-- ── Freezing an issued invoice ──────────────────────────────────────────────

create or replace function assert_invoice_lines_mutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  v_status text;
  v_number text;
begin
  select status, invoice_number into v_status, v_number
    from invoices where id = v_invoice_id;

  -- No row means the invoice itself is being deleted and the cascade is taking
  -- its lines with it. The parent's own delete guard has already had its say.
  if v_status is not null and v_status <> 'draft' then
    raise exception
      'Invoice % is % and its lines can no longer be changed. Void it and issue a new one.',
      coalesce(v_number, v_invoice_id::text), v_status
      using errcode = 'check_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists assert_invoice_lines_mutable_trigger on invoice_lines;
create trigger assert_invoice_lines_mutable_trigger
  before insert or update or delete on invoice_lines
  for each row execute function assert_invoice_lines_mutable();

create or replace function assert_invoice_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- draft → issued → void, and nothing comes back: an issued number that
  -- reverts to a draft is a number reused. A draft is not voided, it is
  -- deleted — it was never a document.
  if old.status <> new.status then
    if not (
      (old.status = 'draft'  and new.status = 'issued') or
      (old.status = 'issued' and new.status = 'void')
    ) then
      raise exception 'Cannot move invoice from % to %.', old.status, new.status
        using errcode = 'check_violation';
    end if;
  end if;

  -- sync_invoice_total() is the one writer of total_usd, and it cannot run on a
  -- non-draft invoice because the line trigger above blocks the write that would
  -- call it. So any change to a financial field here came from a caller.
  if old.status <> 'draft' then
    if new.invoice_number is distinct from old.invoice_number
       or new.total_usd    is distinct from old.total_usd
       or new.quote_id     is distinct from old.quote_id
       or new.booking_id   is distinct from old.booking_id
       or new.issue_date   is distinct from old.issue_date
       or new.currency     is distinct from old.currency
       or new.client_name  is distinct from old.client_name then
      raise exception
        'Invoice % is % and can no longer be edited. Void it and issue a new one.',
        coalesce(old.invoice_number, old.id::text), old.status
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists assert_invoice_transition_trigger on invoices;
create trigger assert_invoice_transition_trigger before update on invoices
  for each row execute function assert_invoice_transition();

-- Only a draft can be deleted. An issued invoice is voided, which keeps its
-- number spoken for and its reason on the record.
create or replace function assert_invoice_deletable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status <> 'draft' then
    raise exception 'Invoice % is % and cannot be deleted. Void it instead.',
      coalesce(old.invoice_number, old.id::text), old.status
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

drop trigger if exists assert_invoice_deletable_trigger on invoices;
create trigger assert_invoice_deletable_trigger before delete on invoices
  for each row execute function assert_invoice_deletable();

-- ── RLS: service-role only, like every other finance table (group_31 cat. 2) ──
-- `invoices` was already enabled by group_31 with no policies; this keeps that
-- and gives the new table the same treatment.

alter table invoices enable row level security;
alter table invoice_lines enable row level security;

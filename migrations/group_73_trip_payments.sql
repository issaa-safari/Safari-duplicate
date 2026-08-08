-- Group 73: one payment ledger for every trip
--
-- Money received has lived in two tables that never reconciled: `quote_payments`
-- (against a quote) and `booking_payments` (against a booking). A trip promoted
-- from an accepted quote got a row in *both*, and the receipts screen avoided
-- double-counting only by ignoring bookings that had a quote behind them.
--
-- Worse, every booking-creation path inserted a `booking_payments` row with
-- status 'pending' and nothing anywhere ever updated it — so a website or
-- fixed-departure booking could never be shown as settled.
--
-- `trip_payments` replaces both. A row here means money actually changed hands;
-- what is *expected* is the invoice's job (group_75), not the ledger's. It
-- carries either a quote_id or a booking_id — a trip may exist as an accepted
-- quote with no booking, or as a booking with no quote — and readers resolve one
-- to the other before summing, so a split trip can never report two balances.
--
-- The backfill records where each row came from, so re-running this file cannot
-- duplicate the ledger, and so the import can be reconciled or rolled back.
-- `quote_payments` and `booking_payments` are left in place, no longer read or
-- written, to be dropped a release later.
--
-- Idempotent — safe to re-run. Run after group_72.

create table if not exists trip_payments (
  id uuid primary key default gen_random_uuid(),

  -- A trip is reachable by either key; at least one must be present. Both are
  -- `on delete restrict`, which is what stops a quote or booking with money
  -- against it being deleted — group_65 deliberately kept that guard on
  -- quote_payments while unblocking quote deletion for everything else.
  quote_id uuid references quotes(id) on delete restrict,
  booking_id uuid references bookings(id) on delete restrict,
  constraint trip_payments_trip_ref_chk
    check (quote_id is not null or booking_id is not null),

  amount_usd numeric(12,2) not null check (amount_usd > 0),
  payment_type text not null default 'deposit'
    check (payment_type in ('deposit', 'balance', 'full', 'partial', 'refund')),
  method text null
    check (method in ('bank_transfer', 'card', 'cash', 'mpesa', 'cheque', 'other')),
  reference text null,
  notes text null,
  received_at date not null default current_date,
  created_by uuid,

  -- Provenance of a backfilled row. Null for anything recorded natively here.
  source_table text check (source_table in ('quote_payments', 'booking_payments')),
  source_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trip_payments_quote_idx on trip_payments (quote_id);
create index if not exists trip_payments_booking_idx on trip_payments (booking_id);
create index if not exists trip_payments_received_idx on trip_payments (received_at desc);

-- What makes the backfill below re-runnable.
create unique index if not exists trip_payments_source_uniq
  on trip_payments (source_table, source_id)
  where source_id is not null;

drop trigger if exists update_trip_payments_updated_at on trip_payments;
create trigger update_trip_payments_updated_at before update on trip_payments
  for each row execute function update_updated_at_column();

-- ── RLS: service-role only, like every other finance table (group_31 cat. 2) ──
alter table trip_payments enable row level security;

-- ── Backfill ────────────────────────────────────────────────────────────────

-- Quote payments carry every column this table needs, so they move verbatim.
insert into trip_payments (
  quote_id, amount_usd, payment_type, method, reference, notes,
  received_at, created_by, source_table, source_id, created_at
)
select
  qp.quote_id, qp.amount_usd, qp.payment_type, qp.method, qp.reference, qp.notes,
  qp.received_at, qp.created_by, 'quote_payments', qp.id, qp.created_at
from quote_payments qp
on conflict (source_table, source_id) where source_id is not null do nothing;

-- Booking payments need translating, and most of them are not payments at all.
--
--   * Only 'paid' rows are money received. The 'pending' rows were stubs for the
--     full trip price written at booking time; they are an expectation, and the
--     invoice carries that now.
--   * `amount_usd > 0` is not redundant: the manual-booking form writes a
--     legitimate zero-amount row when there is neither deposit nor balance, and
--     this table's CHECK would abort the whole migration on it.
--   * There is no date column on the source, so `received_at` comes from
--     `created_at`. Letting it default to today would relocate every historical
--     receipt to migration day and skew the P&L's date filters.
--   * `booking_payments.method` has no CHECK of its own, so an out-of-set value
--     is possible and would abort the migration; it is folded to 'other'.
insert into trip_payments (
  booking_id, amount_usd, payment_type, method, reference, notes,
  received_at, source_table, source_id, created_at
)
select
  bp.booking_id,
  bp.amount_usd,
  case
    when bp.status = 'refunded' then 'refund'
    when bp.notes ilike 'deposit%' then 'deposit'
    else 'partial'
  end,
  case
    when bp.method in ('bank_transfer', 'card', 'cash', 'mpesa', 'cheque', 'other') then bp.method
    when bp.method is null then null
    else 'other'
  end,
  bp.reference,
  bp.notes,
  bp.created_at::date,
  'booking_payments',
  bp.id,
  bp.created_at
from booking_payments bp
where bp.status = 'paid'
  and bp.amount_usd > 0
on conflict (source_table, source_id) where source_id is not null do nothing;

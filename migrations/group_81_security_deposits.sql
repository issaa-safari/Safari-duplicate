-- Group 81: refundable security deposits
--
-- A rider hands over money against damaging the bike, and at the end of the trip
-- it goes back. That is a liability — cash held on someone else's behalf — not
-- income, and it has had nowhere to live.
--
-- The obvious shortcut is a new `payment_type` on `trip_payments`, and it is
-- wrong twice over. `lib/balance.ts` sums that table to decide what a trip has
-- received, so a $500 deposit would make an unpaid trip read as settled; and
-- handing it back would land as a refund of trip income, which it is not. A
-- separate table means the balance code needs no special case at all — deposits
-- are simply not in the query.
--
-- Per rider, not per booking. `booking_travellers` already carries `motorbike_id`
-- and `is_rider` (group_44), so two riders on one booking can be settled
-- independently: one gets the full amount back, the other loses part of it to a
-- cracked pannier.
--
-- Held vs returned is **derived from `returned_at`**, never stored — the same
-- rule that keeps `paid` off `invoices.status` (group_76). One copy of the
-- answer, computed by lib/security-deposit.ts.
--
-- Idempotent — safe to re-run. Run after group_80.
--
-- NOTE: the money kept back when a bike is damaged *is* revenue, but recording it
-- as such is a deliberate separate step (a trip payment, or an expense offset).
-- Retaining it here only stops it being owed back; it does not book it as income,
-- because guessing which would put a number in the P&L nobody asked for.

create table if not exists security_deposits (
  id uuid primary key default gen_random_uuid(),

  -- restrict, not cascade: a booking holding someone's cash must not be
  -- deletable out from under it. Return the deposit first.
  booking_id uuid not null references bookings(id) on delete restrict,

  -- Which rider it belongs to. Nullable and `set null` because the traveller row
  -- can be corrected or removed long after the deposit was taken, and losing the
  -- link must never lose the money.
  booking_traveller_id uuid references booking_travellers(id) on delete set null,

  -- Snapshots. `rider_name` survives the traveller row being deleted, and
  -- `motorbike_id` records which bike the deposit was actually against — the
  -- traveller's current bike may differ by the time it is returned.
  motorbike_id uuid references motorbikes(id) on delete set null,
  rider_name text,

  amount_usd numeric(12,2) not null,

  method text,
  reference text,
  notes text,

  taken_at date not null default current_date,

  returned_amount_usd numeric(12,2) not null default 0,
  returned_at date,
  retained_reason text,

  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint security_deposits_amount_chk
    check (amount_usd > 0),

  constraint security_deposits_returned_amount_chk
    check (returned_amount_usd >= 0 and returned_amount_usd <= amount_usd),

  -- Nothing can have been returned before there is a date it was returned on.
  constraint security_deposits_returned_shape_chk
    check (returned_at is not null or returned_amount_usd = 0),

  -- Keeping part of a rider's money requires saying why. This is the only
  -- record of the damage, and an unexplained shortfall is what a dispute looks
  -- like six months later.
  constraint security_deposits_retained_reason_chk
    check (
      returned_at is null
      or returned_amount_usd = amount_usd
      or (retained_reason is not null and btrim(retained_reason) <> '')
    )
);

create index if not exists security_deposits_booking_idx
  on security_deposits (booking_id);
create index if not exists security_deposits_traveller_idx
  on security_deposits (booking_traveller_id);
-- The finance overview asks "what are we holding?", which is every row with no
-- return date against it.
create index if not exists security_deposits_held_idx
  on security_deposits (booking_id) where returned_at is null;

drop trigger if exists update_security_deposits_updated_at on security_deposits;
create trigger update_security_deposits_updated_at before update on security_deposits
  for each row execute function update_updated_at_column();

-- RLS: service-role only, the group_31 category-2 pattern every finance table
-- follows. Enabled with no policies, so PostgREST sees nothing and only the
-- admin client can read or write it.
alter table security_deposits enable row level security;

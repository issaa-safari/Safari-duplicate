-- Group 82: the security deposit as a priced, public part of a departure
--
-- group_81 gave a *taken* deposit somewhere to live (security_deposits — always
-- real money, always tied to a rider). This group gives the deposit an *amount*
-- before any money has changed hands: what a departure will ask for, set when
-- the departure is created, shown on the website next to the trip price, and
-- known to the booking before a single rider has been named.
--
-- Two new columns, deliberately not a new table:
--
--   * `departures.security_deposit_usd` — per seat, alongside `price_usd`. Same
--     shape, same editing surface, same "shown on the website" rule.
--
--   * `bookings.deposit_due_usd` — snapshotted at booking time from
--     `departures.security_deposit_usd * number_of_travellers`, the same way
--     `total_price_usd` is snapshotted from the departure's price. It answers
--     "how much should we collect" without recomputing it by hand, and it
--     survives the departure's price changing later.
--
-- Neither column is money received. `deposit_due_usd` is what is expected;
-- `security_deposits` rows (group_81) are what has actually been taken. A
-- booking can show "$1,000 due, $0 taken" for weeks before a rider turns up
-- with cash — that gap is the whole point of keeping the two separate.
--
-- And critically: `deposit_due_usd` must never reach lib/balance.ts. It is not
-- part of `total_price_usd`, is not owed to the business, and does not belong
-- in anything that sums to revenue.
--
-- Idempotent — safe to re-run. Run after group_81.

alter table departures add column if not exists security_deposit_usd numeric(12,2) not null default 0;
alter table bookings add column if not exists deposit_due_usd numeric(12,2) not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'departures_security_deposit_usd_chk') then
    alter table departures add constraint departures_security_deposit_usd_chk
      check (security_deposit_usd >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'bookings_deposit_due_usd_chk') then
    alter table bookings add constraint bookings_deposit_due_usd_chk
      check (deposit_due_usd >= 0);
  end if;
end $$;

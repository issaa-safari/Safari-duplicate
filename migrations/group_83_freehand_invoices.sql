-- Group 83: freehand invoices
--
-- Every invoice has had to belong to a trip (`invoices_trip_ref_chk`), and every
-- receipt has had to belong to one too (`trip_payments_trip_ref_chk`) — so a
-- one-off invoice with no quote or booking behind it was impossible to raise,
-- and even if it existed, nothing could be recorded as paid against it.
--
-- Both constraints are relaxed to require *something* that identifies the
-- invoice, not specifically a trip: a quote, a booking, a client record, or at
-- minimum a client name typed by hand. `trip_payments` gains the option to be
-- identified by `invoice_id` alone (added in group_76), so a receipt can settle
-- a freehand invoice directly with no trip reference at all.
--
-- No backfill: every existing row already satisfies both relaxed constraints,
-- since they are strictly weaker than what came before.
--
-- `trip_payments_trip_ref_chk` was declared inline inside `create table` in
-- group_73, so `add constraint ... if not exists` cannot replace its definition
-- — it has to be dropped and re-added.
--
-- Idempotent — safe to re-run. Run after group_82.

alter table invoices drop constraint if exists invoices_trip_ref_chk;
alter table invoices add constraint invoices_trip_ref_chk
  check (
    quote_id is not null
    or booking_id is not null
    or client_id is not null
    or client_name is not null
  );

alter table trip_payments drop constraint if exists trip_payments_trip_ref_chk;
alter table trip_payments add constraint trip_payments_trip_ref_chk
  check (
    quote_id is not null
    or booking_id is not null
    or invoice_id is not null
  );

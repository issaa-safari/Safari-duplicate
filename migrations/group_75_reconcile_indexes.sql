-- Group 75: reconcile the index drift between production and migrations/
--
-- docs/current/schema-drift.md claimed the drift was resolved on 2026-08-06. It
-- was not. Comparing production against a database built from
-- migrations/baseline/ turned up 59 differences, in both directions:
--
--   * 33 indexes exist in production that no file in migrations/ describes.
--     32 of the 33 are named idx_<table>_<column>_id.
--   * 26 indexes the group files define do not exist in production. They span
--     15 groups, from group_10 to group_70, and each index line has been in its
--     file since that file was first committed — so this is not a case of the
--     files changing after the fact.
--
-- The cause is Supabase's Performance Advisor, applied through the dashboard
-- and never written back — the exact failure mode this repo's drift doc exists
-- to prevent. get_advisors still shows the loop running in both directions: it
-- currently reports six "unindexed foreign key" warnings, every one of which
-- names an index section B below already defines, while separately advising
-- that most of the section A indexes be dropped as unused.
--
-- This file makes migrations/ describe production, and production hold what
-- migrations/ describes. Both sides end at 200 indexes.
--
-- The section A indexes are kept rather than dropped. "Unused" on a dataset
-- this small mostly means "little traffic", whereas an unindexed foreign key
-- makes deleting a parent row scan the whole child table. They are cheap.
--
-- Everything is `create index if not exists`, so this is a no-op against a
-- database that already agrees.
--
-- Idempotent — safe to re-run. Run after group_74.

-- ── A. In production, undescribed until now ─────────────────────────────────
-- Transcribed from pg_indexes.indexdef on the live database, not guessed.
-- Same approach as group_72_capture_undocumented_production_objects.sql.

create index if not exists idx_accommodations_destination_id on accommodations (destination_id);
create index if not exists idx_activities_destination_id on activities (destination_id);
create index if not exists idx_activity_locations_destination_id on activity_locations (destination_id);
create index if not exists idx_activity_locations_park_id on activity_locations (park_id);
create index if not exists idx_communication_logs_request_id on communication_logs (request_id);
create index if not exists idx_hotel_vouchers_booking_id on hotel_vouchers (booking_id);
create index if not exists idx_hotel_vouchers_quote_id on hotel_vouchers (quote_id);
create index if not exists idx_quote_acceptances_delivery_id on quote_acceptances (delivery_id);
create index if not exists idx_quote_acceptances_quote_id on quote_acceptances (quote_id);
create index if not exists idx_quote_day_items_accommodation_id on quote_day_items (accommodation_id);
create index if not exists idx_quote_day_items_activity_id on quote_day_items (activity_id);
create index if not exists idx_quote_day_items_room_id on quote_day_items (room_id);
create index if not exists idx_quote_day_items_staff_id on quote_day_items (staff_id);
create index if not exists idx_quote_day_items_vehicle_id on quote_day_items (vehicle_id);
create index if not exists idx_quote_days_destination_id on quote_days (destination_id);
create index if not exists idx_quote_deliveries_quote_id on quote_deliveries (quote_id);
create index if not exists idx_quote_deliveries_quote_version_id on quote_deliveries (quote_version_id);
create index if not exists idx_quote_price_lines_quote_day_id on quote_price_lines (quote_day_id);
create index if not exists idx_quote_price_lines_rate_card_id on quote_price_lines (rate_card_id);
create index if not exists idx_quote_price_lines_supplier_rate_id on quote_price_lines (supplier_rate_id);
create index if not exists idx_quote_travellers_age_band_id on quote_travellers (age_band_id);
create index if not exists idx_quotes_accepted_version_id on quotes (accepted_version_id);
create index if not exists idx_quotes_departure_id on quotes (departure_id);
create index if not exists idx_quotes_tour_id on quotes (tour_id);
create index if not exists idx_request_staff_assignments_staff_id on request_staff_assignments (staff_id);
create index if not exists idx_request_vehicle_assignments_vehicle_id on request_vehicle_assignments (vehicle_id);
create index if not exists idx_requests_handled_by on requests (handled_by);
create index if not exists idx_requests_tour_id on requests (tour_id);
create index if not exists idx_supplier_payments_quote_id on supplier_payments (quote_id);
create index if not exists idx_tour_days_accommodation_alt_id on tour_days (accommodation_alt_id);
create index if not exists idx_tour_days_accommodation_id on tour_days (accommodation_id);
create index if not exists idx_tour_days_destination_id on tour_days (destination_id);
create index if not exists idx_traveller_agreements_agreement_template_id on traveller_agreements (agreement_template_id);

-- ── B. Defined by a group file, but missing from production ─────────────────
-- Copied verbatim from the group that already declares each one; the comment
-- names it. Six of these are what the advisor is currently asking for under
-- "unindexed foreign keys" — quotes.client_id has no index at all today.

create index if not exists vehicles_is_active_idx on vehicles (is_active);                                    -- group_10
create index if not exists tour_staff_is_active_idx on tour_staff (is_active);                                -- group_11
create index if not exists tour_staff_role_idx on tour_staff (role);                                          -- group_11
create index if not exists quote_days_version_idx on quote_days (quote_version_id, day_number);               -- group_12
create index if not exists quotes_client_idx on quotes (client_id);                                           -- group_12
create index if not exists parks_active_idx on parks (is_active);                                             -- group_15
create index if not exists quote_versions_cost_base_idx
  on quote_versions (cost_base_usd) where cost_base_usd is not null;                                          -- group_19
create index if not exists whatsapp_conversations_wa_id_idx on whatsapp_conversations (wa_id);                 -- group_20
create index if not exists idx_booking_travellers_email on booking_travellers (email);                        -- group_21
create index if not exists idx_bookings_status on bookings (status);                                          -- group_21
create index if not exists supplier_payments_supplier_idx on supplier_payments (supplier_id);                  -- group_33
create index if not exists supplier_rate_cards_supplier_idx
  on supplier_rate_cards (supplier_id) where supplier_id is not null;                                         -- group_33
create index if not exists requests_archived_at_idx
  on requests (archived_at) where archived_at is not null;                                                    -- group_37
create index if not exists requests_status_changed_idx on requests (status_changed_at);                        -- group_37
create index if not exists quotes_is_template_idx on quotes (is_template) where is_template;                   -- group_39
create index if not exists idx_activity_log_entity on activity_log (entity_type, entity_id);                   -- group_55
create index if not exists activity_locations_activity_idx on activity_locations (activity_id);                -- group_57
create index if not exists idx_agreement_templates_active on agreement_templates (is_active);                  -- group_66
create index if not exists idx_booking_travellers_motorbike_id on booking_travellers (motorbike_id);           -- group_66
create index if not exists idx_motorbikes_is_active on motorbikes (is_active);                                 -- group_66
create index if not exists idx_motorbikes_status on motorbikes (status);                                       -- group_66
create index if not exists traveller_agreements_departure_idx on traveller_agreements (departure_id);          -- group_66
create index if not exists idx_hotel_vouchers_accommodation_id on hotel_vouchers (accommodation_id);           -- group_69
create index if not exists idx_leads_created_at on leads (created_at desc);                                    -- group_70
create index if not exists idx_leads_phone_number on leads (phone_number);                                     -- group_70
create index if not exists idx_leads_status on leads (status);                                                 -- group_70

-- ── C. One policy that also existed only in production ──────────────────────
--
-- Turned up by the same fingerprint comparison: production had 17 policies to
-- the baseline's 16. `activity_locations` is a join table — activity to
-- destination or park, plus a bilingual label — so it holds no client data, and
-- the public site needs it to render where an activity happens.
--
-- `using (true)` rather than the `is_active = true` its sibling policies use,
-- because this table has no is_active column of its own: which activities are
-- visible is still decided by the "Public read active activities" policy on the
-- parent. Transcribed from pg_policies, not invented.

drop policy if exists "Public read activity locations" on activity_locations;
create policy "Public read activity locations" on activity_locations
  for select to public
  using (true);

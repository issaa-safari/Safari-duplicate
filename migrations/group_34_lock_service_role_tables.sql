-- Group 34: Lock down remaining service-role-only tables + function hardening
-- Run in Supabase SQL Editor after Group 33.
--
-- The Supabase security advisor flags the quote-builder tables (RLS disabled
-- since group_12) as exposed to the anon key — including sensitive columns
-- like quote_deliveries.access_token and booking_travellers.passport_number.
-- Every app read/write on these tables goes through the service-role client
-- (which bypasses RLS), so enabling RLS with zero policies (group_31
-- Category 2) locks out the public API with no app behaviour change.
--
-- Also revokes public EXECUTE on internal SECURITY DEFINER helpers (trigger
-- functions and the mutability assert) and pins search_path on the two
-- remaining functions the advisor flags.

alter table quotes enable row level security;
alter table quote_versions enable row level security;
alter table quote_travellers enable row level security;
alter table quote_days enable row level security;
alter table quote_day_items enable row level security;
alter table quote_price_lines enable row level security;
alter table quote_deliveries enable row level security;
alter table quote_acceptances enable row level security;
alter table quote_payments enable row level security;
alter table supplier_rate_cards enable row level security;
alter table supplier_rates enable row level security;
alter table traveller_age_bands enable row level security;
alter table parks enable row level security;
alter table vehicles enable row level security;
alter table tour_staff enable row level security; -- keeps its group_30 public-read policy
alter table whatsapp_conversations enable row level security;
alter table bookings enable row level security;
alter table booking_payments enable row level security;
alter table booking_travellers enable row level security;
alter table contact_messages enable row level security;

-- Internal helpers: not callable via the public REST RPC surface.
revoke all on function assert_quote_version_mutable(uuid) from public, anon, authenticated;
revoke all on function enforce_direct_quote_child_mutable() from public, anon, authenticated;
revoke all on function enforce_quote_day_item_mutable() from public, anon, authenticated;

-- Pin search_path (advisor: function_search_path_mutable).
alter function update_updated_at_column() set search_path = public;
alter function generate_quote_number() set search_path = public;

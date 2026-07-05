-- Group 43: Harden the functions added in groups 37–39
--
-- Addresses Supabase security-advisor warnings introduced by the new functions:
--   * pin search_path on the status-stamp trigger function
--   * revoke public/anon/authenticated EXECUTE on the SECURITY DEFINER helpers so
--     they cannot be called through the REST API (/rest/v1/rpc/...). The app calls
--     copy_quote_as_new via the service-role client, which is unaffected;
--     generate_booking_tasks / requests_stamp_status_changed are trigger functions
--     that fire as the table owner regardless of these grants.
--
-- Idempotent — safe to re-run. Run after group_42.

alter function requests_stamp_status_changed() set search_path = public;

revoke execute on function copy_quote_as_new(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function generate_booking_tasks() from public, anon, authenticated;
revoke execute on function requests_stamp_status_changed() from public, anon, authenticated;

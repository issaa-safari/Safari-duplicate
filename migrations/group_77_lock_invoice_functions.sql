-- Group 77: take the invoice functions off the public API
--
-- Caught by the Supabase advisor immediately after group_76 landed, and written
-- back here rather than clicked away in the dashboard — that habit is what
-- caused the drift group_75 had to reconcile.
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default, and Supabase
-- exposes every function in the `public` schema at /rest/v1/rpc/<name>. So all
-- six functions group_76 created were callable by an unauthenticated visitor.
--
-- The one that actually matters is `next_invoice_number()`: it is not a trigger
-- function, it takes no arguments, and every call does `nextval`. Anyone could
-- have advanced the sequence at will, leaving permanent gaps in the invoice
-- numbering — the one thing about an invoice number that has to hold. The other
-- five would raise "trigger functions can only be called as triggers", which is
-- noise rather than damage, but they have no business being reachable either.
--
-- SECURITY DEFINER is kept. It is what lets these read company_settings and
-- invoices, both of which are service-role-only under RLS, and revoking EXECUTE
-- does not affect trigger firing: Postgres checks EXECUTE when the trigger is
-- *created*, not each time it fires.
--
-- `is_admin_user()` carries the same warning and is deliberately left alone: it
-- predates this work and RLS policies across the schema depend on it. That is a
-- separate decision, not one to make in passing here.
--
-- Idempotent — safe to re-run. Run after group_76.

revoke all on function public.next_invoice_number()          from public, anon, authenticated;
revoke all on function public.assign_invoice_number()         from public, anon, authenticated;
revoke all on function public.sync_invoice_total()            from public, anon, authenticated;
revoke all on function public.assert_invoice_lines_mutable()  from public, anon, authenticated;
revoke all on function public.assert_invoice_transition()     from public, anon, authenticated;
revoke all on function public.assert_invoice_deletable()      from public, anon, authenticated;

-- The app reaches these only through triggers, under the service role, which
-- keeps its own grant.
grant execute on function public.next_invoice_number() to service_role;

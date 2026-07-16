-- Group 56: honour is_active in the RLS admin gate.
--
-- is_admin_user() (group_31) decided admin access purely on admin_users
-- membership by email, ignoring is_active. The app-level checks
-- (lib/supabase/middleware.ts, lib/auth/admin-access.ts) were tightened to
-- require is_active, but a deactivated admin's still-valid Supabase session
-- kept full RLS read/write on clients, requests, communication_logs, etc. via
-- direct PostgREST calls. Re-defining the function to require is_active closes
-- that gap so deactivation actually revokes database access.
--
-- Idempotent — safe to re-run. Run after group_55.

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users a
    where a.email = (auth.jwt() ->> 'email')
      and a.is_active
  );
$$;

revoke all on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to authenticated;

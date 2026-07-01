-- Group 31: Enable RLS on tables that were fully exposed to the anon key.
--
-- Supabase's security advisor flagged 22 public tables with Row Level
-- Security disabled — meaning anyone holding the public anon key (embedded
-- in every page's client bundle, meant to be public) could read/write them
-- directly via the REST API, completely bypassing the Next.js app, its
-- middleware, and every admin-auth check in the codebase.
--
-- Category 1: tables read via the session-based anon-key client in admin
-- pages (clients, requests, communication_logs). These get a real policy
-- that mirrors the app's own admin check (membership in admin_users), so
-- legitimate admin pages keep working exactly as before, while everyone
-- else is blocked.
--
-- Category 2: tables only ever touched via the service-role client, which
-- always bypasses RLS regardless. These get RLS enabled with zero
-- policies — full lockout for anon/authenticated, no behavior change for
-- the app itself.

-- Helper used by policies below. SECURITY DEFINER so it can read
-- admin_users even after admin_users itself gets RLS-locked in this same
-- migration — a policy's subquery is normally still subject to the target
-- table's own RLS, which would make a plain EXISTS(...) against
-- admin_users always false once admin_users has RLS + no policies.
-- SECURITY DEFINER runs as the function owner and bypasses that.
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
  );
$$;

-- Only ever called from policies evaluated as `authenticated` — anon never
-- needs to invoke it (no anon-targeting policy references it).
revoke all on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to authenticated;

-- Category 1: admin-only tables read via the anon-key client
alter table public.clients enable row level security;
create policy "Admins can manage clients" on public.clients
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

alter table public.requests enable row level security;
create policy "Admins can manage requests" on public.requests
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

alter table public.communication_logs enable row level security;
create policy "Admins can manage communication_logs" on public.communication_logs
  for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- Category 2: service-role-only tables (app never needs anon/authenticated
-- access) — enable RLS, no policies, full lockout except for service_role.
alter table public.admin_users enable row level security;
alter table public.company_settings enable row level security;
alter table public.tasks enable row level security;
alter table public.blog_posts enable row level security;
alter table public.booking_travelers enable row level security;
alter table public.quote_lines enable row level security;
alter table public.reviews enable row level security;
alter table public.gift_vouchers enable row level security;
alter table public.tour_day_activities enable row level security;
alter table public.payments enable row level security;
alter table public.booking_staff enable row level security;
alter table public.invoices enable row level security;
alter table public.referrals enable row level security;
alter table public.vehicle_pricing enable row level security;
alter table public.supplier_costs enable row level security;
alter table public.waitlists enable row level security;
alter table public.park_fees enable row level security;
alter table public.hotel_pricing enable row level security;
alter table public.corporate_enquiries enable row level security;

-- Supabase-provided objects, for a plain Postgres.
--
-- The migrations assume they are running inside a Supabase project, so they
-- reference roles and schemas that Supabase creates for you: the `anon`,
-- `authenticated` and `service_role` roles that RLS policies are granted to,
-- the `auth` schema behind auth.uid()/auth.jwt(), and `storage` for buckets.
-- On a bare Postgres none of that exists, which is why loading the schema used
-- to fail before it reached the first table.
--
-- Run this once, before 002_schema.sql, on any database that is NOT a Supabase
-- project (local dev, CI, a scratch database for verifying a migration).
-- Never run it against Supabase — it would collide with the real objects.
--
-- The auth/storage definitions here are deliberately minimal: just enough
-- surface for the schema to load and for RLS policies to evaluate. They are
-- not a re-implementation of Supabase Auth.

-- Roles are cluster-wide, so tolerate them already existing.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

create schema if not exists auth;
create schema if not exists storage;
create extension if not exists pgcrypto;

-- PostgREST puts the verified JWT claims here; the real Supabase helpers read
-- the same setting, so policies behave the same way locally.
create or replace function auth.jwt() returns jsonb
  language sql stable
  as $$ select coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb $$;

create or replace function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;

create or replace function auth.role() returns text
  language sql stable
  as $$ select auth.jwt() ->> 'role' $$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique
);

create table if not exists storage.buckets (
  id text primary key,
  name text,
  public boolean default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid
);

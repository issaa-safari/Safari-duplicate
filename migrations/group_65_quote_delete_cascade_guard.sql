-- Group 65: Let quotes be deleted even when they have itinerary/pricing rows
--
-- The immutability guards (group_13/17) fire BEFORE DELETE on every quote child
-- (quote_days, quote_price_lines, quote_travellers, quote_day_items) and call
-- assert_quote_version_mutable(version_id). But deleting a quote cascades
-- quotes → quote_versions → children, and Postgres removes the parent version
-- row *before* the child cascade deletes run — so the child's BEFORE DELETE
-- trigger looks the version up, finds nothing, and raises
-- "Quote version not found." The whole transaction rolls back, so bulk (and
-- single) delete silently fails for any quote that has an itinerary. A locked
-- (sent/accepted) quote hits the sibling "…is locked…" error the same way.
--
-- Fix: on DELETE, only enforce mutability when the parent version STILL EXISTS
-- (a direct edit of a locked version's child). When the version is already gone
-- the delete is a cascade from removing the version/quote — allow it. INSERT and
-- UPDATE behaviour is unchanged, so a locked version's content still can't be
-- edited.
--
-- Idempotent — safe to re-run. Run after group_64.

-- quote_days / quote_price_lines / quote_travellers guard.
create or replace function enforce_direct_quote_child_mutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    -- Cascade from deleting the version/quote → the version row is already
    -- gone; nothing to protect. Only a *direct* child delete against a still-
    -- existing (locked) version should be blocked.
    if exists (select 1 from quote_versions where id = old.quote_version_id) then
      perform assert_quote_version_mutable(old.quote_version_id);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    perform assert_quote_version_mutable(old.quote_version_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform assert_quote_version_mutable(new.quote_version_id);
  end if;
  return new;
end;
$$;

-- quote_day_items guard (parent version reached via quote_days).
create or replace function enforce_quote_day_item_mutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version_id uuid;
begin
  if tg_op = 'DELETE' then
    select quote_version_id into v_version_id from quote_days where id = old.quote_day_id;
    -- Parent day gone (cascade) or version gone (cascade) → allow. Only guard a
    -- direct item delete while both the day and its (locked) version remain.
    if v_version_id is not null
       and exists (select 1 from quote_versions where id = v_version_id) then
      perform assert_quote_version_mutable(v_version_id);
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    select quote_version_id into v_version_id from quote_days where id = old.quote_day_id;
    if v_version_id is not null then
      perform assert_quote_version_mutable(v_version_id);
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    select quote_version_id into v_version_id from quote_days where id = new.quote_day_id;
    perform assert_quote_version_mutable(v_version_id);
  end if;
  return new;
end;
$$;

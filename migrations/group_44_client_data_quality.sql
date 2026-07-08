-- Group 44: client data-quality guardrails
--
-- P0 bug fix: no unique constraint existed on clients.email (only a
-- non-unique index), so duplicate-lookup races or code paths that skip the
-- lookup (e.g. blank-email inserts) could silently create duplicate clients.
-- Also normalises trailing/leading whitespace left by earlier ad hoc entry
-- (e.g. "New " / "Issa Hussein ").
--
-- Idempotent — safe to re-run.

update clients set first_name = btrim(first_name) where first_name <> btrim(first_name);
update clients set last_name = btrim(last_name) where last_name <> btrim(last_name);

-- Partial + case-insensitive: blank/null emails are exempt (many clients
-- legitimately have no email yet), but two clients can no longer share the
-- same real email address.
create unique index if not exists clients_email_unique_idx
  on clients (lower(email))
  where email is not null and email <> '';

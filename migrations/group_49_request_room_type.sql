-- Group 49: requests.preferred_room_type
--
-- The New Request form captures a preferred room type (sharing / single /
-- family) and createRequest inserts it, but the column was never added by
-- any migration — so every "Save Request" against a fresh database fails
-- with a schema error. Adds the nullable column the form and the request
-- detail page already use.
--
-- Idempotent — safe to re-run.

alter table requests
  add column if not exists preferred_room_type text;

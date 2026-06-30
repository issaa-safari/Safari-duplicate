-- group_29: add heard_about_us to requests
-- Nullable; intentionally unused until the intake form adds the dropdown.
-- Kept separate from source: source is the system intake channel (website /
-- whatsapp / direct); heard_about_us is the user-reported discovery channel
-- (Google / Instagram / Referral / Returning / Other).
alter table requests
  add column if not exists heard_about_us text;

-- Group 18: Add metadata fields to tours for card display
alter table tours
  add column if not exists countries_visited text,
  add column if not exists start_destination  text,
  add column if not exists end_destination    text;

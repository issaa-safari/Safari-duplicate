-- Group 23: Rich tour content for rideexpeditions-style detail pages.
-- All additive and idempotent. Safe to run multiple times.

alter table tours
  add column if not exists subtitle_ar          text,
  add column if not exists overview_ar          text,
  add column if not exists hero_image_url       text,
  add column if not exists gallery_urls         text[]  default '{}',
  add column if not exists route_map_url        text,
  add column if not exists highlights_en        text[]  default '{}',
  add column if not exists highlights_ar        text[]  default '{}',
  add column if not exists included_en          text[]  default '{}',
  add column if not exists included_ar          text[]  default '{}',
  add column if not exists excluded_en          text[]  default '{}',
  add column if not exists excluded_ar          text[]  default '{}',
  add column if not exists terrain              text,
  add column if not exists vehicle              text,
  add column if not exists accommodation_level  text,
  add column if not exists total_distance_km    numeric(10,2),
  add column if not exists faqs                 jsonb   default '[]';

-- Per-day hero image for the itinerary cards
alter table tour_days
  add column if not exists image_url text;

-- Group 74: sellable add-on services
--
-- Visa applications, travel insurance and anything else sold alongside a trip
-- but priced outside the itinerary.
--
-- These deliberately do NOT ride on quote_price_lines, for two reasons that are
-- not obvious:
--
--   * save_trip() begins every save with
--     `delete from quote_price_lines where quote_version_id = ...` and omits
--     is_optional from its INSERT, so an add-on written there is destroyed by
--     the next edit of the quote.
--   * assert_quote_version_mutable() blocks any write to an accepted version —
--     which is exactly when someone wants to add a visa.
--
-- So a service attaches to the *trip* (quote or booking), the same dual key
-- trip_payments uses, and is summed alongside the trip price rather than inside
-- it. Nothing in the pricing engine changes.
--
-- Prices and names are snapshotted onto the attachment, following the same rule
-- as hotel_vouchers: re-pricing the catalogue must never silently re-price a
-- trip that was already sold.
--
-- Idempotent — safe to re-run. Run after group_73.

-- ── The catalogue ───────────────────────────────────────────────────────────

create table if not exists services (
  id uuid primary key default gen_random_uuid(),

  name_en text not null,
  name_ar text,
  description_en text,
  description_ar text,

  default_price_usd numeric(12,2) not null default 0 check (default_price_usd >= 0),
  -- 'person' multiplies by the traveller count when attached; 'booking' is a
  -- flat charge for the trip however many people are on it.
  pricing_unit text not null default 'person'
    check (pricing_unit in ('person', 'booking')),

  -- Soft delete: a retired service must stay resolvable from the trips that
  -- already bought it.
  is_active boolean not null default true,
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One catalogue entry per name, which is also what makes the seed re-runnable.
create unique index if not exists services_name_uniq
  on services (lower(btrim(name_en)));

create index if not exists services_active_idx on services (is_active, sort_order);

drop trigger if exists update_services_updated_at on services;
create trigger update_services_updated_at before update on services
  for each row execute function update_updated_at_column();

-- A catalogue an admin edits in the UI, so it takes the admin-manage policy the
-- other catalogues use — not the service-role-only lockdown of the money tables.
alter table services enable row level security;

drop policy if exists "Admins can manage services" on services;
create policy "Admins can manage services" on services
  for all to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- ── What a trip has bought ──────────────────────────────────────────────────

create table if not exists trip_services (
  id uuid primary key default gen_random_uuid(),

  -- Same dual key as trip_payments: a trip may be an accepted quote with no
  -- booking, or a booking with no quote.
  quote_id uuid references quotes(id) on delete restrict,
  booking_id uuid references bookings(id) on delete restrict,
  constraint trip_services_trip_ref_chk
    check (quote_id is not null or booking_id is not null),

  -- restrict, not cascade: deleting a catalogue entry must not silently erase
  -- what a client was charged. Retire it with is_active instead.
  service_id uuid not null references services(id) on delete restrict,

  -- Snapshotted at the moment it was sold.
  name_en text not null,
  name_ar text,
  unit_price_usd numeric(12,2) not null check (unit_price_usd >= 0),
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  total_usd numeric(12,2)
    generated always as (round(quantity * unit_price_usd, 2)) stored,

  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trip_services_quote_idx on trip_services (quote_id);
create index if not exists trip_services_booking_idx on trip_services (booking_id);
create index if not exists trip_services_service_idx on trip_services (service_id);

drop trigger if exists update_trip_services_updated_at on trip_services;
create trigger update_trip_services_updated_at before update on trip_services
  for each row execute function update_updated_at_column();

-- Money: service-role only, like trip_payments and the rest of finance.
alter table trip_services enable row level security;

-- ── Seed ────────────────────────────────────────────────────────────────────
-- Starting prices only — the operator edits them in the admin. Re-runnable via
-- the unique name index.

insert into services (name_en, name_ar, description_en, description_ar, default_price_usd, pricing_unit, sort_order)
values
  (
    'Visa application',
    'استخراج التأشيرة',
    'Application handled on the traveller''s behalf. Government fee included.',
    'نتولى تقديم الطلب نيابة عن المسافر، وتشمل الرسوم الحكومية.',
    100.00, 'person', 10
  ),
  (
    'Medical & travel insurance',
    'التأمين الطبي وتأمين السفر',
    'Cover for the duration of the trip, including medical evacuation.',
    'تغطية طوال مدة الرحلة، وتشمل الإخلاء الطبي.',
    45.00, 'person', 20
  )
on conflict do nothing;

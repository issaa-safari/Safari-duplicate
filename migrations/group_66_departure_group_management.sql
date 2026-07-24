-- Group 66: Fixed-departure group management
--
-- For fixed (group) departures — especially motorbike tours — a single
-- departure carries many bookings, each with many travellers who arrive on
-- different flights, each needs a motorbike assigned, and each must sign an
-- agreement covering the operator's policies. This group adds:
--
--   * motorbikes                — the operator's fleet
--   * booking_traveller_flights — per-traveller arrival/departure flights
--                                 (mirrors request_flights from group_40)
--   * agreement_templates       — reusable policy/waiver documents
--   * traveller_agreements      — one signable, token-linked record per
--                                 traveller (mirrors the quote_deliveries /
--                                 quote_acceptances e-sign pattern, group_12)
--   * columns on booking_travellers — motorbike assignment, rider flag,
--                                 dietary/allergy/emergency details
--
-- Idempotent — safe to re-run. Run after group_65.

-- ── Fleet ────────────────────────────────────────────────────────────────
create table if not exists motorbikes (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- friendly label, e.g. "Bike 01"
  make text,
  model text,
  plate_number text,
  engine_cc integer check (engine_cc is null or engine_cc > 0),
  color text,
  status text not null default 'available'
    check (status in ('available', 'maintenance', 'retired')),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_motorbikes_status on motorbikes(status);
create index if not exists idx_motorbikes_is_active on motorbikes(is_active);

-- ── Per-traveller booking columns ────────────────────────────────────────
alter table booking_travellers
  add column if not exists motorbike_id uuid references motorbikes(id) on delete set null,
  add column if not exists is_rider boolean not null default true,
  add column if not exists dietary_requirements text,
  add column if not exists allergies text,
  add column if not exists emergency_contact text;

create index if not exists idx_booking_travellers_motorbike_id
  on booking_travellers(motorbike_id);

-- ── Per-traveller flights (mirrors group_40 request_flights) ──────────────
create table if not exists booking_traveller_flights (
  id uuid primary key default gen_random_uuid(),
  booking_traveller_id uuid not null
    references booking_travellers(id) on delete cascade,
  direction text not null default 'arrival'
    check (direction in ('arrival', 'departure')),
  flight_number text,
  airline text,
  scheduled_at timestamptz,
  airport text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_traveller_flights_traveller_idx
  on booking_traveller_flights (booking_traveller_id, sort_order);

-- ── Agreement templates ──────────────────────────────────────────────────
create table if not exists agreement_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,                       -- full policy/waiver text
  version_label text,
  language text not null default 'en' check (language in ('en', 'ar')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agreement_templates_active
  on agreement_templates(is_active);

-- ── Signable per-traveller agreements ────────────────────────────────────
create table if not exists traveller_agreements (
  id uuid primary key default gen_random_uuid(),
  booking_traveller_id uuid not null unique
    references booking_travellers(id) on delete cascade,
  departure_id uuid references departures(id) on delete set null,
  agreement_template_id uuid references agreement_templates(id) on delete set null,
  access_token uuid unique default gen_random_uuid(),
  title_snapshot text,                      -- frozen at generation time
  body_snapshot text,
  status text not null default 'pending'
    check (status in ('pending', 'signed', 'declined')),
  signed_name text,
  terms_accepted boolean not null default false,
  signed_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists traveller_agreements_departure_idx
  on traveller_agreements(departure_id);
create index if not exists traveller_agreements_token_idx
  on traveller_agreements(access_token);
create index if not exists traveller_agreements_status_idx
  on traveller_agreements(status);

-- ── updated_at triggers (drop-if-exists guards keep this re-runnable) ─────
drop trigger if exists update_motorbikes_updated_at on motorbikes;
create trigger update_motorbikes_updated_at before update on motorbikes
  for each row execute function update_updated_at_column();

drop trigger if exists booking_traveller_flights_updated_at on booking_traveller_flights;
create trigger booking_traveller_flights_updated_at before update on booking_traveller_flights
  for each row execute function update_updated_at_column();

drop trigger if exists update_agreement_templates_updated_at on agreement_templates;
create trigger update_agreement_templates_updated_at before update on agreement_templates
  for each row execute function update_updated_at_column();

drop trigger if exists update_traveller_agreements_updated_at on traveller_agreements;
create trigger update_traveller_agreements_updated_at before update on traveller_agreements
  for each row execute function update_updated_at_column();

-- ── RLS: admin/service-role only ─────────────────────────────────────────
-- Enable with no policies so anon/auth are blocked; the service role bypasses
-- RLS. The public agreement-signing page reads by access_token through the
-- service-role admin client, exactly as the quote portal reads quote_deliveries.
alter table motorbikes enable row level security;
alter table booking_traveller_flights enable row level security;
alter table agreement_templates enable row level security;
alter table traveller_agreements enable row level security;

-- ── Seed a default motorbike-tour agreement template ─────────────────────
insert into agreement_templates (title, body, version_label, language, is_active)
select
  'Motorbike Safari — Rider Agreement & Tour Policies',
  E'RIDER AGREEMENT, RELEASE OF LIABILITY & TOUR POLICIES\n\n'
  'Please read this agreement carefully. By signing you confirm that you have '
  'read, understood and accept the terms below for your motorbike safari with '
  'Safari Adventure Riders.\n\n'
  '1. ASSUMPTION OF RISK\n'
  'Motorcycle touring on public roads and off-road terrain carries inherent '
  'risks including injury, property damage and death. I understand these risks '
  'and voluntarily accept them.\n\n'
  '2. RIDER COMPETENCE & LICENCE\n'
  'I hold a valid motorcycle licence and declare that I am competent to ride a '
  'motorcycle of the class assigned to me. I will disclose any medical '
  'condition that may affect my ability to ride safely.\n\n'
  '3. SAFETY & EQUIPMENT\n'
  'I will wear an approved helmet and appropriate protective gear at all times '
  'while riding, obey traffic laws, ride within my ability and follow the '
  'guide''s instructions.\n\n'
  '4. THE MOTORCYCLE\n'
  'I will inspect the assigned motorcycle before riding and report any defect. '
  'I am responsible for reasonable care of the machine and for damage caused '
  'by negligence or misuse.\n\n'
  '5. ALCOHOL & DRUGS\n'
  'I will not ride under the influence of alcohol or any substance that impairs '
  'my ability to ride safely.\n\n'
  '6. INSURANCE\n'
  'I confirm that I hold valid travel and medical insurance covering '
  'motorcycling activities for the full duration of the tour.\n\n'
  '7. RELEASE OF LIABILITY\n'
  'To the fullest extent permitted by law, I release Safari Adventure Riders, '
  'its staff and agents from all claims arising from my participation, except '
  'those caused by their gross negligence.\n\n'
  '8. CANCELLATION, PAYMENT & CONDUCT\n'
  'I accept the operator''s booking, deposit, cancellation and refund policy, '
  'and understand the guide may end my participation for unsafe or '
  'unacceptable conduct without refund.\n\n'
  'By signing electronically below, I confirm that I am the named traveller, '
  'that I am 18 years or older (or signing with guardian consent), and that I '
  'agree to all terms above.',
  'v1',
  'en',
  true
where not exists (select 1 from agreement_templates);

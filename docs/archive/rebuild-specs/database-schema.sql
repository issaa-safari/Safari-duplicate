-- Safari Ops — PostgreSQL schema (rebuild). Illustrative DDL derived from analysis, not vendor DDL.
-- Requires: CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- Enums ----------
CREATE TYPE request_status AS ENUM ('new','working','open','prebooked','booked','completed','notbooked');
CREATE TYPE quote_status   AS ENUM ('draft','sent','confirmed');
CREATE TYPE template_status AS ENUM ('draft','ready');
CREATE TYPE account_type   AS ENUM ('admin','member','viewer','no_access');
CREATE TYPE user_status    AS ENUM ('invited','waiting_registration','active','canceled');
CREATE TYPE quote_item_type AS ENUM ('accommodation','activity','transfer','meal','option','other');
CREATE TYPE media_kind     AS ENUM ('image','cover','video');

-- ---------- Tenancy & identity ----------
CREATE TABLE company (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,            -- proposal subdomain
  plan          TEXT NOT NULL DEFAULT 'free',
  default_currency CHAR(3) NOT NULL DEFAULT 'USD',
  date_format_long  TEXT DEFAULT 'MMMM D, YYYY',
  date_format_short TEXT DEFAULT 'MMM D, YYYY',
  first_day_of_week SMALLINT DEFAULT 1,
  refno_prefix  TEXT DEFAULT '',
  refno_start   INT DEFAULT 1,
  refno_scheme  TEXT DEFAULT '{YYYY}-{seq}',
  quote_version_scheme TEXT DEFAULT '{refno}.{n}',
  label_overrides JSONB DEFAULT '{}',
  settings      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE app_user (
  id            BIGSERIAL PRIMARY KEY,
  company_id    BIGINT NOT NULL REFERENCES company(id),
  first_name    TEXT, last_name TEXT,
  email         CITEXT NOT NULL,
  password_hash TEXT,
  role          TEXT DEFAULT 'Tour Consultant',
  account_type  account_type NOT NULL DEFAULT 'member',
  status        user_status  NOT NULL DEFAULT 'invited',
  avatar_url    TEXT,
  signature_html TEXT,
  twofa_secret  TEXT, twofa_enabled BOOLEAN DEFAULT false,
  notification_prefs JSONB DEFAULT '{}',
  last_sign_in_at TIMESTAMPTZ, invited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, email)
);

-- ---------- CRM ----------
CREATE TABLE client (
  id          BIGSERIAL PRIMARY KEY,
  company_id  BIGINT NOT NULL REFERENCES company(id),
  salutation  TEXT, first_name TEXT, last_name TEXT NOT NULL,
  email       CITEXT, phone TEXT, country TEXT,
  lead_source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON client (company_id);
CREATE INDEX ON client USING gin (to_tsvector('simple', coalesce(first_name,'')||' '||coalesce(last_name,'')||' '||coalesce(email,'')));

-- ---------- Requests ----------
CREATE TABLE request (
  id            BIGSERIAL PRIMARY KEY,
  company_id    BIGINT NOT NULL REFERENCES company(id),
  client_id     BIGINT REFERENCES client(id),
  assigned_user_id BIGINT REFERENCES app_user(id),
  refno         TEXT NOT NULL,
  status        request_status NOT NULL DEFAULT 'new',
  archived      BOOLEAN DEFAULT false,
  source        TEXT,
  tour_name     TEXT, tour_type TEXT, tour_length TEXT,
  countries     INT[] DEFAULT '{}',
  start_destination TEXT, end_destination TEXT,
  start_date    DATE, end_date DATE, booked_date TIMESTAMPTZ,
  request_value NUMERIC(14,2), request_currency CHAR(3),
  request_info  TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, refno)
);
CREATE INDEX ON request (company_id, status) WHERE archived = false;
CREATE INDEX ON request (company_id, assigned_user_id);

CREATE TABLE request_group (      -- traveler group sizes (groupsize[name][],[amount][])
  id BIGSERIAL PRIMARY KEY, request_id BIGINT NOT NULL REFERENCES request(id) ON DELETE CASCADE,
  name TEXT, amount INT DEFAULT 1
);
CREATE TABLE request_room (       -- standard room settings
  id BIGSERIAL PRIMARY KEY, request_id BIGINT NOT NULL REFERENCES request(id) ON DELETE CASCADE,
  name TEXT, amount INT DEFAULT 1
);

CREATE TABLE traveler (
  id BIGSERIAL PRIMARY KEY, request_id BIGINT NOT NULL REFERENCES request(id) ON DELETE CASCADE,
  full_name TEXT, relation TEXT, is_main_booker BOOLEAN DEFAULT false,
  dob DATE, age INT, dietary TEXT, allergies TEXT
);

CREATE TABLE flight (
  id BIGSERIAL PRIMARY KEY, request_id BIGINT NOT NULL REFERENCES request(id) ON DELETE CASCADE,
  airline TEXT, flight_no TEXT, from_airport TEXT, to_airport TEXT,
  depart_at TIMESTAMPTZ, arrive_at TIMESTAMPTZ, traveler_ids BIGINT[] DEFAULT '{}'
);

CREATE TABLE task (
  id BIGSERIAL PRIMARY KEY, request_id BIGINT NOT NULL REFERENCES request(id) ON DELETE CASCADE,
  type TEXT, status TEXT, due_date DATE, description TEXT, done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE note (
  id BIGSERIAL PRIMARY KEY, request_id BIGINT NOT NULL REFERENCES request(id) ON DELETE CASCADE,
  author_id BIGINT REFERENCES app_user(id), body TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- Quotes ----------
CREATE TABLE tour_template (
  id BIGSERIAL PRIMARY KEY, company_id BIGINT NOT NULL REFERENCES company(id),
  name TEXT NOT NULL, status template_status DEFAULT 'draft',
  locked BOOLEAN DEFAULT false, last_edit_by BIGINT REFERENCES app_user(id),
  content JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE quote (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES request(id) ON DELETE CASCADE,
  template_id BIGINT REFERENCES tour_template(id),
  version_no INT NOT NULL DEFAULT 1,
  status quote_status NOT NULL DEFAULT 'draft',
  language CHAR(2) DEFAULT 'en',
  currency CHAR(3), total_value NUMERIC(14,2),
  public_slug TEXT UNIQUE,            -- hash for digital/pdf URLs
  pdf_url TEXT, digital_url TEXT,
  sent_at TIMESTAMPTZ, confirmed_at TIMESTAMPTZ, opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (request_id, version_no)
);

CREATE TABLE quote_day (
  id BIGSERIAL PRIMARY KEY, quote_id BIGINT NOT NULL REFERENCES quote(id) ON DELETE CASCADE,
  day_no INT NOT NULL, date DATE, country_id INT,
  accommodation_id BIGINT, room_type TEXT, meal_plan TEXT, notes TEXT
);
CREATE INDEX ON quote_day (quote_id, day_no);

CREATE TABLE quote_item (
  id BIGSERIAL PRIMARY KEY, quote_day_id BIGINT NOT NULL REFERENCES quote_day(id) ON DELETE CASCADE,
  type quote_item_type NOT NULL, ref_id BIGINT, title TEXT, description TEXT,
  qty NUMERIC(10,2) DEFAULT 1, unit TEXT, sort INT DEFAULT 0
);

CREATE TABLE quote_position (      -- pricing lines
  id BIGSERIAL PRIMARY KEY, quote_id BIGINT NOT NULL REFERENCES quote(id) ON DELETE CASCADE,
  label TEXT, category TEXT, qty NUMERIC(10,2) DEFAULT 1,
  unit_cost_minor BIGINT DEFAULT 0, margin_pct NUMERIC(6,3) DEFAULT 0,
  sell_price_minor BIGINT DEFAULT 0, currency CHAR(3),
  pax_tier TEXT                    -- adult / child band
);

CREATE TABLE booking (
  id BIGSERIAL PRIMARY KEY, request_id BIGINT NOT NULL REFERENCES request(id) ON DELETE CASCADE,
  quote_id BIGINT REFERENCES quote(id), booking_value NUMERIC(14,2), currency CHAR(3),
  confirmed_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE booking_staff (
  booking_id BIGINT REFERENCES booking(id) ON DELETE CASCADE, staff_id BIGINT, role TEXT,
  PRIMARY KEY (booking_id, staff_id)
);
CREATE TABLE booking_vehicle (
  booking_id BIGINT REFERENCES booking(id) ON DELETE CASCADE, vehicle_id BIGINT, seats INT,
  PRIMARY KEY (booking_id, vehicle_id)
);

-- ---------- Content library & shared catalog ----------
CREATE TABLE country (id SERIAL PRIMARY KEY, name TEXT NOT NULL, iso CHAR(2));
CREATE TABLE airport (id SERIAL PRIMARY KEY, name TEXT, iata CHAR(3), city TEXT, country_id INT REFERENCES country(id));

CREATE TABLE accommodation (       -- shared/global catalog
  id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, country_id INT REFERENCES country(id),
  type TEXT, class TEXT, premium BOOLEAN DEFAULT false,
  facilities TEXT[] DEFAULT '{}', amenities TEXT[] DEFAULT '{}', room_types TEXT[] DEFAULT '{}',
  location geography(Point,4326), description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON accommodation USING gist (location);
CREATE INDEX ON accommodation (country_id);

CREATE TABLE accommodation_favorite (
  company_id BIGINT REFERENCES company(id), accommodation_id BIGINT REFERENCES accommodation(id),
  PRIMARY KEY (company_id, accommodation_id)
);

CREATE TABLE destination (
  id BIGSERIAL PRIMARY KEY, company_id BIGINT REFERENCES company(id), -- null = global
  name TEXT NOT NULL, country_id INT REFERENCES country(id), type TEXT, description TEXT,
  location geography(Point,4326)
);
CREATE TABLE activity (
  id BIGSERIAL PRIMARY KEY, company_id BIGINT REFERENCES company(id),
  name TEXT NOT NULL, country_id INT REFERENCES country(id), destination_id BIGINT REFERENCES destination(id),
  description TEXT
);
CREATE TABLE theme (
  id BIGSERIAL PRIMARY KEY, company_id BIGINT REFERENCES company(id), name TEXT NOT NULL, description TEXT
);
CREATE TABLE vehicle (
  id BIGSERIAL PRIMARY KEY, company_id BIGINT REFERENCES company(id), name TEXT, type TEXT, seats INT
);
CREATE TABLE tour_staff (
  id BIGSERIAL PRIMARY KEY, company_id BIGINT REFERENCES company(id),
  name TEXT, role TEXT, phone TEXT, email CITEXT
);

CREATE TABLE media_asset (
  id BIGSERIAL PRIMARY KEY, company_id BIGINT REFERENCES company(id),
  owner_type TEXT NOT NULL, owner_id BIGINT NOT NULL, kind media_kind NOT NULL,
  url TEXT NOT NULL, storage_bytes BIGINT DEFAULT 0, sort INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON media_asset (owner_type, owner_id);

-- ---------- Reference data (enums with versioned cache) ----------
CREATE TABLE reference_value (
  id BIGSERIAL PRIMARY KEY, company_id BIGINT REFERENCES company(id), -- null = global
  dataset TEXT NOT NULL, name TEXT NOT NULL, extra JSONB DEFAULT '{}', sort INT DEFAULT 0
);
CREATE INDEX ON reference_value (company_id, dataset);
CREATE TABLE reference_version (
  company_id BIGINT REFERENCES company(id), dataset TEXT, version TEXT,
  PRIMARY KEY (company_id, dataset)
);

-- ---------- Billing ----------
CREATE TABLE subscription (
  id BIGSERIAL PRIMARY KEY, company_id BIGINT UNIQUE REFERENCES company(id),
  plan TEXT, status TEXT, seats INT DEFAULT 2, renews_at TIMESTAMPTZ
);
CREATE TABLE addon (id SERIAL PRIMARY KEY, slug TEXT UNIQUE, name TEXT, price_minor BIGINT, currency CHAR(3), trial_days INT);
CREATE TABLE company_addon (
  company_id BIGINT REFERENCES company(id), addon_id INT REFERENCES addon(id),
  status TEXT, trial_ends_at TIMESTAMPTZ, PRIMARY KEY (company_id, addon_id)
);

-- ---------- Audit ----------
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY, company_id BIGINT, user_id BIGINT,
  entity TEXT, entity_id BIGINT, action TEXT, meta JSONB, at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON audit_log (company_id, entity, entity_id);

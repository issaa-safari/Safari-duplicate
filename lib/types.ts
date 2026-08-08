// Shared application/domain types.
//
// These are hand-authored from the SQL migrations in `migrations/group_*.sql`
// (the source of truth for the schema). When live Supabase access is available
// they can be regenerated with:
//
//   supabase gen types typescript --project-id <project-ref> > lib/database.types.ts
//
// and these interfaces re-expressed in terms of Database['public']['Tables'].

export type QuoteStatus =
  | 'draft' | 'ready' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'cancelled'

export type RequestStage =
  | 'new' | 'working_on' | 'open' | 'pre_booked' | 'booked' | 'completed' | 'not_booked'

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'cancelled'

export type Moment = 'morning' | 'afternoon' | 'evening' | 'night' | ''

// --- Admin global search (/api/admin/search) ---
export interface SearchQuote {
  id: string
  quote_number: string | null
  status: QuoteStatus | string
  client_name: string | null
  title?: string | null
}
export interface SearchClient {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}
export interface SearchRequest {
  id: string
  reference: string | null
  stage: RequestStage | string
  client_name: string | null
}
export interface SearchResults {
  quotes: SearchQuote[]
  clients: SearchClient[]
  requests: SearchRequest[]
}

// --- Content library lookup row (destinations / accommodations / activities) ---
export interface Lookup {
  id: string
  name: string
  destination_id?: string | null
}

// --- Geo columns (migrations/group_58_geo_coordinates.sql) ---
// Shared by destinations, accommodations and parks. Coordinates come from a
// pasted Google Maps link (lib/geo.ts) or explicit lat/lng in the content
// forms; google_place_id is reserved for the optional key-gated Google
// enrichment (lib/google-places.ts). They drive the proposal's itinerary map
// and the auto per-leg distances (with quote_days.distance_km as override).
export interface GeoFields {
  latitude: number | null
  longitude: number | null
  google_maps_url: string | null
  google_place_id: string | null
}

// --- Bookings & finance ---
export interface BookingPayment {
  id?: string
  amount_usd: number
  status: PaymentStatus | string
  method?: string | null
  reference?: string | null
  created_at: string
}

export interface BookingTraveller {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  date_of_birth: string | null
  nationality: string | null
  passport_number: string | null
  // group_66 — motorbike assignment, rider flag, group-management details
  motorbike_id?: string | null
  is_rider?: boolean
  dietary_requirements?: string | null
  allergies?: string | null
  emergency_contact?: string | null
  // group_67 — rooming list
  room_label?: string | null
  room_type?: string | null
}

// --- Fixed-departure group management (migrations/group_66_*) ---

export type MotorbikeStatus = 'available' | 'maintenance' | 'retired'

export interface Motorbike {
  id: string
  name: string
  make: string | null
  model: string | null
  plate_number: string | null
  engine_cc: number | null
  color: string | null
  status: MotorbikeStatus | string
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type FlightDirection = 'arrival' | 'departure'

export interface BookingTravellerFlight {
  id: string
  booking_traveller_id: string
  direction: FlightDirection | string
  flight_number: string | null
  airline: string | null
  scheduled_at: string | null
  airport: string | null
  notes: string | null
  sort_order: number
}

export interface AgreementTemplate {
  id: string
  title: string
  body: string
  version_label: string | null
  language: 'en' | 'ar' | string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AgreementStatus = 'pending' | 'signed' | 'declined'

export interface TravellerAgreement {
  id: string
  booking_traveller_id: string
  departure_id: string | null
  agreement_template_id: string | null
  access_token: string | null
  title_snapshot: string | null
  body_snapshot: string | null
  status: AgreementStatus | string
  signed_name: string | null
  terms_accepted: boolean
  signed_at: string | null
  ip_address: string | null
  user_agent: string | null
  // group_67 — language snapshot + email-reminder tracking
  language_snapshot?: string | null
  last_emailed_at?: string | null
  reminder_count?: number
  created_at: string
  updated_at: string
}

// --- Multi-location activities (migrations/group_57_activity_locations.sql) ---
// A generic activity (e.g. "Waterfall Visit", "Game Drive") can occur at
// several places — each a destination and/or a park.
export interface ActivityLocation {
  id: string
  activity_id: string
  destination_id: string | null
  park_id: string | null
  label_en: string | null
  label_ar: string | null
  sort_order: number
  created_at: string
}

// --- Activity / audit log (migrations/group_55_activity_log.sql) ---
export interface ActivityLog {
  id: string
  actor_id: string | null
  actor_email: string | null
  entity_type: string
  entity_id: string | null
  action: string
  summary: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// --- Booking links (migrations/group_69_*) ---
// A token-linked, shareable self-service booking form for one departure.
export interface BookingLink {
  id: string
  departure_id: string
  token: string
  label: string | null
  language: 'en' | 'ar' | string
  max_bookings: number | null
  use_count: number
  expires_at: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// --- Hotel vouchers (migrations/group_69_*) ---
export type VoucherStatus = 'draft' | 'sent' | 'confirmed' | 'cancelled'

export interface HotelVoucher {
  id: string
  voucher_number: string
  token: string
  departure_id: string | null
  booking_id: string | null
  quote_id: string | null
  accommodation_id: string | null
  hotel_name: string
  hotel_email: string | null
  check_in: string
  check_out: string
  nights: number
  num_rooms: number
  room_type: string | null
  num_guests: number
  guest_names: string[]
  meal_plan: string | null
  special_requests: string | null
  internal_notes: string | null
  status: VoucherStatus | string
  language: 'en' | 'ar' | string
  hotel_confirmation_ref: string | null
  sent_at: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
}

// --- Editable proposal template (migrations/group_69_*) ---
export interface ProposalTemplate {
  id: string
  title: string
  cover_intro_en: string | null
  cover_intro_ar: string | null
  email_subject_en: string | null
  email_subject_ar: string | null
  email_message_en: string | null
  email_message_ar: string | null
  email_signature_en: string | null
  email_signature_ar: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'archived'

export interface Lead {
  id: string
  created_at: string
  updated_at: string
  phone_number: string | null
  full_name: string | null
  email: string | null
  preferred_language: 'en' | 'ar'
  tour_type: string | null
  travel_dates: string | null
  group_size: string | null
  budget_range: string | null
  special_requests: string | null
  status: LeadStatus
  source: string
}

// --- Trip payments (migrations/group_73_trip_payments.sql) ---
// One ledger for money received, whether the trip was sold as a quote or booked
// directly. A row here means money arrived; what is *expected* is the invoice's
// job, not the ledger's. Replaces quote_payments and booking_payments.

export type PaymentType = 'deposit' | 'balance' | 'full' | 'partial' | 'refund'

export type PaymentMethod =
  | 'bank_transfer' | 'card' | 'cash' | 'mpesa' | 'cheque' | 'other'

export interface TripPayment {
  id: string
  /** At least one of quote_id / booking_id is always present. */
  quote_id: string | null
  booking_id: string | null
  amount_usd: number
  payment_type: PaymentType
  method: PaymentMethod | null
  reference: string | null
  notes: string | null
  received_at: string
  created_by: string | null
  /** Set only on rows carried over by the group_73 backfill. */
  source_table: 'quote_payments' | 'booking_payments' | null
  source_id: string | null
  created_at: string
  updated_at: string
}

// --- Add-on services (migrations/group_74_services.sql) ---
// Visas, insurance and anything else sold alongside a trip but priced outside
// the itinerary. They attach to the trip rather than to quote_price_lines,
// because save_trip() deletes every price line on each save and an accepted
// version cannot be written to at all.

export type ServicePricingUnit = 'person' | 'booking'

export interface Service {
  id: string
  name_en: string
  name_ar: string | null
  description_en: string | null
  description_ar: string | null
  default_price_usd: number
  pricing_unit: ServicePricingUnit
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface TripService {
  id: string
  /** At least one of quote_id / booking_id is always present. */
  quote_id: string | null
  booking_id: string | null
  service_id: string
  /** Name and price as they were when sold — the catalogue may move since. */
  name_en: string
  name_ar: string | null
  unit_price_usd: number
  quantity: number
  /** Generated in Postgres from quantity × unit_price_usd. */
  total_usd: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// --- Invoices (migrations/group_76_invoices.sql) ---
// trip_payments records what arrived; an invoice records what was asked for, and
// fixes it. `paid` is deliberately not a status — whether an invoice is settled
// is derived from the ledger by lib/balance.ts, so there is only ever one copy
// of that answer.

export type InvoiceStatus = 'draft' | 'issued' | 'void'

/** What a screen shows, which is the stored status plus what the ledger says. */
export type InvoiceDisplayStatus = InvoiceStatus | 'paid' | 'part-paid' | 'overdue'

export type InvoiceLineKind = 'trip' | 'service' | 'discount' | 'other'

export interface Invoice {
  id: string
  /** At least one of quote_id / booking_id is always present. */
  quote_id: string | null
  booking_id: string | null
  /** Null while a draft: numbers are drawn at issue so drafts do not burn them. */
  invoice_number: string | null
  status: InvoiceStatus
  issue_date: string | null
  due_date: string | null
  /** Client details as they were at issue — the client record may move since. */
  client_id: string | null
  client_name: string | null
  client_email: string | null
  client_address: string | null
  currency: string
  /** Maintained in Postgres from the lines. Never written directly. */
  total_usd: number
  notes: string | null
  terms: string | null
  issued_at: string | null
  voided_at: string | null
  void_reason: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceLine {
  id: string
  invoice_id: string
  description_en: string
  description_ar: string | null
  quantity: number
  /** May be negative: a discount is a negative line. */
  unit_price_usd: number
  /** Generated in Postgres from quantity × unit_price_usd. */
  total_usd: number
  kind: InvoiceLineKind
  trip_service_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

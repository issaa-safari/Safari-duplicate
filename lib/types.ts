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

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
}

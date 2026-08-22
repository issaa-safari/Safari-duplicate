import type { SupabaseClient } from '@supabase/supabase-js'

export type EnquiryChannel =
  | 'website_quote'
  | 'tour_enquiry'
  | 'contact'
  | 'whatsapp'
  | 'whatsapp_flow'

export type EnquiryIntake = {
  channel: EnquiryChannel
  externalEventId: string
  source: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  country?: string | null
  language?: 'en' | 'ar'
  subject?: string | null
  question?: string | null
  heardAboutUs?: string | null
  quoteIntent: boolean
  quoteTitle?: string | null
  tourId?: string | null
  preferredStartDate?: string | null
  tripLengthNights?: number | null
  adults?: number | null
}

export type EnquiryIntakeResult = {
  status: 'processing' | 'processed' | 'failed'
  duplicate: boolean
  eventId: string
  clientId?: string | null
  requestId?: string | null
  quoteId?: string | null
  quoteVersionId?: string | null
  error?: string
}

export async function ingestEnquiry(
  admin: SupabaseClient,
  input: EnquiryIntake,
): Promise<EnquiryIntakeResult> {
  const { data, error } = await admin.rpc('ingest_enquiry_atomic', { p_payload: input })
  if (error) throw new Error(error.message)

  const result = data as EnquiryIntakeResult | null
  if (!result || result.status === 'failed') {
    throw new Error(result?.error ?? 'INTAKE_PROCESSING_FAILED')
  }
  return result
}

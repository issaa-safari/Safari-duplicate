// Editable proposal template helpers.
//
// The proposal cover letter and the client email that carries the proposal link
// are edited in the admin back office (app/admin/settings/proposal) and stored
// as a single active `proposal_templates` row, bilingual EN/AR. Both use
// [Placeholder] tokens that the app substitutes at send time.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProposalTemplate } from './types'

export type ProposalVars = {
  clientName?: string | null
  tourTitle?: string | null
  startDate?: string | null
  startDestination?: string | null
  numberOfDays?: number | string | null
  quoteNumber?: string | null
}

const TOKENS: Array<[token: string, key: keyof ProposalVars]> = [
  ['[Client Full Name]', 'clientName'],
  ['[Tour Title]', 'tourTitle'],
  ['[Start Date]', 'startDate'],
  ['[Start Destination]', 'startDestination'],
  ['[Number of Days]', 'numberOfDays'],
  ['[Quote Number]', 'quoteNumber'],
]

// Replace every [Placeholder] with its value (missing values collapse to '').
export function applyProposalPlaceholders(text: string, vars: ProposalVars): string {
  let out = text
  for (const [token, key] of TOKENS) {
    const value = vars[key]
    out = out.split(token).join(value === null || value === undefined ? '' : String(value))
  }
  return out
}

export async function getActiveProposalTemplate(
  admin: SupabaseClient,
): Promise<ProposalTemplate | null> {
  const { data } = await admin
    .from('proposal_templates')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as ProposalTemplate) ?? null
}

// Pick the language-appropriate field, falling back to the other language, then
// to a built-in default. Keeps email/cover rendering resilient to half-filled
// templates.
export function pickLocalised(
  template: ProposalTemplate | null,
  field: 'cover_intro' | 'email_subject' | 'email_message' | 'email_signature',
  locale: 'en' | 'ar',
  fallback: string,
): string {
  if (!template) return fallback
  const primary = template[`${field}_${locale}` as keyof ProposalTemplate] as string | null
  const other = template[`${field}_${locale === 'en' ? 'ar' : 'en'}` as keyof ProposalTemplate] as string | null
  return (primary?.trim() || other?.trim() || fallback)
}

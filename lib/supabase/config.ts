// The Supabase project URL and publishable key are public (they ship in the
// browser bundle; Supabase marks publishable keys as safe to share), so
// hardcoded fallbacks are safe. The env vars still win when set. The secret
// (service role) key has no fallback and must stay env-only.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://oejlkzcoynijqtokbizz.supabase.co'

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_dF4hEcCc_kbW2fRXLICbsw_XTSNvtCL'

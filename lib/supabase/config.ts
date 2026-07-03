// The Supabase project URL is public (it ships in the browser bundle), so a
// hardcoded fallback is safe. NEXT_PUBLIC_SUPABASE_URL still wins when set.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://oejlkzcoynijqtokbizz.supabase.co'

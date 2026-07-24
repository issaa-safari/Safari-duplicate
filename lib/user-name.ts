// Derive a first/last name from a Supabase user's `user_metadata`.
//
// The two sign-up paths populate different keys:
//   - Email/password registration writes `first_name` / `last_name` directly.
//   - Google OAuth writes Google's identity claims — `given_name` / `family_name`,
//     plus a combined `name` / `full_name` — and never sets first_name/last_name.
//
// Reading only first_name/last_name (as the account settings form used to) leaves
// the name blank for Google sign-ups. This resolves the name from whichever keys
// are present, preferring the explicit split, then Google's split claims, then a
// single display name split on whitespace.
export function deriveName(
  meta: Record<string, unknown> | null | undefined,
): { firstName: string; lastName: string } {
  const m = meta ?? {}
  const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

  const first = str(m.first_name) || str(m.given_name)
  const last = str(m.last_name) || str(m.family_name)
  if (first || last) return { firstName: first, lastName: last }

  const full = str(m.full_name) || str(m.name)
  if (full) {
    const [f, ...rest] = full.split(/\s+/)
    return { firstName: f, lastName: rest.join(' ') }
  }

  return { firstName: '', lastName: '' }
}

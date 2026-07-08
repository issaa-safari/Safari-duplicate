const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email)
}

/** Throws with a user-facing message if the name/email fields are unusable. */
export function assertValidClientIdentity(opts: { firstName?: string | null; lastName?: string | null; email?: string | null }) {
  const first = (opts.firstName ?? '').trim()
  const last = (opts.lastName ?? '').trim()
  const email = (opts.email ?? '').trim()

  if (!first) throw new Error('First name is required.')
  if (!last) throw new Error('Last name is required.')
  if (email && !isValidEmail(email)) throw new Error(`"${email}" is not a valid email address.`)
}

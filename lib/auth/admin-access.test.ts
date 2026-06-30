import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertAdminAccess, getAdminProfile } from './admin-access'

// Minimal chainable fake for the .from().select().eq().maybeSingle() shape
// that admin-access.ts relies on.
function fakeSupabase(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result)
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { client: { from } as unknown as SupabaseClient, from, select, eq, maybeSingle }
}

describe('getAdminProfile', () => {
  it('returns null without querying when email is missing', async () => {
    const { client, from } = fakeSupabase({ data: null, error: null })
    const result = await getAdminProfile(client, null)
    expect(result).toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it('returns null without querying when email is undefined', async () => {
    const { client, from } = fakeSupabase({ data: null, error: null })
    const result = await getAdminProfile(client, undefined)
    expect(result).toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it('returns the profile for a known admin email', async () => {
    const profile = { full_name: 'Jane Admin', role: 'owner' }
    const { client, from, select, eq } = fakeSupabase({ data: profile, error: null })

    const result = await getAdminProfile(client, 'jane@example.com')

    expect(result).toEqual(profile)
    expect(from).toHaveBeenCalledWith('admin_users')
    expect(select).toHaveBeenCalledWith('full_name, role')
    expect(eq).toHaveBeenCalledWith('email', 'jane@example.com')
  })

  it('returns null when no admin row matches', async () => {
    const { client } = fakeSupabase({ data: null, error: null })
    const result = await getAdminProfile(client, 'nobody@example.com')
    expect(result).toBeNull()
  })

  it('returns null when the query errors, rather than throwing', async () => {
    const { client } = fakeSupabase({ data: null, error: { message: 'connection reset' } })
    const result = await getAdminProfile(client, 'jane@example.com')
    expect(result).toBeNull()
  })
})

describe('assertAdminAccess', () => {
  it('returns the profile for an authorized admin', async () => {
    const profile = { full_name: 'Jane Admin', role: 'owner' }
    const { client } = fakeSupabase({ data: profile, error: null })

    await expect(assertAdminAccess(client, 'jane@example.com')).resolves.toEqual(profile)
  })

  it('throws when the email has no matching admin row', async () => {
    const { client } = fakeSupabase({ data: null, error: null })

    await expect(assertAdminAccess(client, 'intruder@example.com')).rejects.toThrow(
      'You are not authorized to access the admin system.'
    )
  })

  it('throws when no email is provided', async () => {
    const { client } = fakeSupabase({ data: null, error: null })

    await expect(assertAdminAccess(client, null)).rejects.toThrow(
      'You are not authorized to access the admin system.'
    )
  })
})

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findOrCreateClientByEmail } from '@/lib/server/clients'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Ensure a CRM client row exists for this account so self-registered
    // clients — including Google sign-ups — show up in the admin. Best-effort:
    // never let a CRM write block the login redirect.
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>
        const fullName = typeof meta.full_name === 'string' ? meta.full_name
          : typeof meta.name === 'string' ? meta.name : ''
        const [metaFirst, ...metaRest] = fullName.trim().split(/\s+/)
        await findOrCreateClientByEmail(createAdminClient(), {
          email: user.email,
          first_name: (typeof meta.first_name === 'string' ? meta.first_name : metaFirst) || null,
          last_name: (typeof meta.last_name === 'string' ? meta.last_name : metaRest.join(' ')) || null,
        })
      }
    } catch (err) {
      console.error('[auth/callback] ensure client failed', err)
    }
  }

  // Return the user to where they started (e.g. a booking page), else the
  // dashboard. Only accept same-origin relative paths: a single leading slash
  // not followed by another slash or backslash, so protocol-relative targets
  // like `//evil.com` (which resolve to an external origin) are rejected.
  const next = searchParams.get('next')
  const dest = next && /^\/(?![/\\])/.test(next) ? next : '/dashboard'
  return NextResponse.redirect(new URL(dest, request.url))
}

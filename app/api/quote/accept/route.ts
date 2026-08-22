import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { acceptQuoteAtomically, mapQuoteAcceptanceError } from '@/lib/server/quote-booking'
import { notifyAdmin, emailShell, detailRows } from '@/lib/email'
import { site } from '@/lib/site'
import { enforceRateLimit } from '@/lib/rate-limit'

const acceptQuoteSchema = z.object({
  deliveryId: z.string().uuid(),
  versionId: z.string().uuid(),
  quoteId: z.string().uuid(),
  clientName: z.string().trim().min(1).max(200),
}).strict()

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, 'quote-accept', 10, 60_000)
  if (limited) return limited

  try {
    const parsed = acceptQuoteSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Enter a valid name and use the original quote link.' }, { status: 400 })
    }

    const { deliveryId, versionId, quoteId, clientName } = parsed.data
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? req.headers.get('x-real-ip')
      ?? null
    const userAgent = req.headers.get('user-agent')
    const admin = createAdminClient()

    const accepted = await acceptQuoteAtomically(admin, {
      quoteId,
      versionId,
      deliveryId,
      clientName,
      ipAddress,
      userAgent,
      isAdmin: false,
    })

    // Post-commit notification: an email-provider failure never invalidates the
    // acceptance or its booking.
    await notifyAdmin(
      `Quote accepted by ${clientName}`,
      emailShell(
        'Quote accepted',
        detailRows([
          ['Accepted by', clientName],
          ['Quote ID', quoteId],
          ['Booking ID', accepted.bookingId],
        ]) +
          `<p style="margin:16px 0 0;font-size:14px"><a href="${site.url}/admin/quotes/${quoteId}">Open in admin</a></p>`,
      ),
    )

    return NextResponse.json({ ok: true, bookingId: accepted.bookingId })
  } catch (error) {
    console.error('[quote/accept]', error)
    const mapped = mapQuoteAcceptanceError(error)
    return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  }
}

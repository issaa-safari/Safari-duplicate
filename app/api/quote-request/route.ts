import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdmin, emailShell, detailRows } from '@/lib/email'
import { site } from '@/lib/site'
import { enforceRateLimit } from '@/lib/rate-limit'
import { ingestEnquiry } from '@/lib/server/enquiry-intake'

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'quote-request', 5, 60_000)
  if (limited) return limited

  try {
    const body = request.headers.get('content-type')?.includes('application/json')
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries())
    const {
      firstName, lastName, email, phone, country, tourType, startDate, duration,
      groupSize, budget, budgetBasis, dateFlexibility, preferences, heardAboutUs,
      source, language, submissionId, channel,
    } = body

    // Where the enquiry came from. Free text in the column, so it is clamped to
    // the values the app actually produces rather than trusting the query string
    // a visitor can edit — otherwise the Insights source breakdown becomes a
    // write-anything field.
    const ALLOWED_SOURCES = new Set(['website', 'request_link', 'whatsapp', 'referral'])
    const resolvedSource = ALLOWED_SOURCES.has(String(source)) ? String(source) : 'website'

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()
    const tourId: string | null = tourType && tourType !== 'custom' ? String(tourType) : null
    const parsedDuration = Number.parseInt(String(duration || ''), 10)
    const parsedGroupSize = Number.parseInt(String(groupSize || ''), 10)
    const context = [
      preferences ? String(preferences) : null,
      budget ? `Budget: USD ${budget} (${budgetBasis === 'total' ? 'total trip' : 'per person'})` : null,
      dateFlexibility ? `Date flexibility: ${dateFlexibility}` : null,
    ].filter(Boolean).join('\n')

    const intake = await ingestEnquiry(admin, {
      channel: channel === 'tour_enquiry' ? 'tour_enquiry' : 'website_quote',
      externalEventId: String(submissionId || request.headers.get('idempotency-key') || crypto.randomUUID()),
      source: resolvedSource,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      country: country ? String(country) : null,
      language: language === 'ar' ? 'ar' : 'en',
      question: context || null,
      heardAboutUs: heardAboutUs ? String(heardAboutUs) : null,
      quoteIntent: true,
      tourId,
      preferredStartDate: startDate ? String(startDate) : null,
      tripLengthNights: Number.isFinite(parsedDuration) ? Math.max(1, parsedDuration - 1) : null,
      adults: Number.isFinite(parsedGroupSize) ? parsedGroupSize : 1,
    })

    // Best-effort admin alert; never blocks the response.
    await notifyAdmin(
      `New quote request from ${firstName} ${lastName}`,
      emailShell(
        'New quote request',
        detailRows([
          ['Name', `${firstName} ${lastName}`],
          ['Email', email],
          ['Phone', phone],
          ['Country', country],
          ['Tour', tourType],
          ['Start date', startDate],
          ['Duration', duration],
          ['Group size', groupSize],
          ['Budget', budget],
          ['Preferences', preferences],
          ['Heard about us', heardAboutUs],
        ]) +
          `<p style="margin:16px 0 0;font-size:14px"><a href="${site.url}/admin/requests/${intake.requestId}">Open in admin</a></p>`
      ),
      email
    )

    return NextResponse.json(
      { success: true, requestId: intake.requestId, quoteId: intake.quoteId, duplicate: intake.duplicate },
      { status: 201 }
    )
  } catch (error) {
    console.error('[quote-request] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

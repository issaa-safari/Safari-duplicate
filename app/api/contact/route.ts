import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdmin, emailShell, detailRows, escapeHtml } from '@/lib/email'
import { enforceRateLimit } from '@/lib/rate-limit'
import { ingestEnquiry } from '@/lib/server/enquiry-intake'

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'contact', 5, 60_000)
  if (limited) return limited

  try {
    const body = request.headers.get('content-type')?.includes('application/json')
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries())
    const { name, email, phone, subject, message, submissionId, language } = body

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    const nameParts = String(name).trim().split(/\s+/).filter(Boolean)
    const intake = await ingestEnquiry(admin, {
      channel: 'contact',
      externalEventId: String(submissionId || request.headers.get('idempotency-key') || crypto.randomUUID()),
      source: 'website',
      firstName: nameParts[0] || 'Contact',
      lastName: nameParts.slice(1).join(' '),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : null,
      language: language === 'ar' ? 'ar' : 'en',
      subject: String(subject).trim(),
      question: String(message).trim(),
      quoteIntent: false,
      adults: 1,
    })

    // Best-effort admin alert; never blocks the response.
    await notifyAdmin(
      `New contact message: ${subject}`,
      emailShell(
        'New contact message',
        detailRows([
          ['Name', name],
          ['Email', email],
          ['Phone', phone],
          ['Subject', subject],
        ]) + `<p style="margin:16px 0 0;font-size:14px;white-space:pre-wrap">${escapeHtml(message)}</p>`
      ),
      email
    )

    return NextResponse.json(
      { success: true, requestId: intake.requestId, duplicate: intake.duplicate },
      { status: 201 }
    )
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

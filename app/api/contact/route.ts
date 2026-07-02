import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdmin, emailShell, detailRows, escapeHtml } from '@/lib/email'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const limited = enforceRateLimit(request, 'contact', 5, 60_000)
  if (limited) return limited

  try {
    const body = await request.json()
    const { name, email, phone, subject, message } = body

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Store contact message (for now, we'll store it in a simple table)
    const { error } = await admin
      .from('contact_messages')
      .insert({
        name,
        email,
        phone: phone || null,
        subject,
        message,
        created_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Contact message error:', error)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

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
      { success: true },
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

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidEmail } from '@/lib/server/validate-client'
import { ingestEnquiry } from '@/lib/server/enquiry-intake'

function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret || !signatureHeader) return false

  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const sigBuf = Buffer.from(signatureHeader)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length) return false
  return crypto.timingSafeEqual(sigBuf, expBuf)
}

async function sendWhatsAppMessage(to: string, body: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !token) return

  await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  if (!isValidSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = JSON.parse(rawBody)
    const admin = createAdminClient()

    const entries: unknown[] = body?.entry ?? []
    for (const entry of entries) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const changes: unknown[] = (entry as any)?.changes ?? []
      for (const change of changes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (change as any)?.value ?? {}
        const messages: unknown[] = value?.messages ?? []
        const contacts: unknown[] = value?.contacts ?? []

        for (const message of messages) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const msg = message as any

          // WhatsApp Flow completion — the client's submitted intake form comes
          // back as an interactive `nfm_reply`. Parse its response_json and
          // capture the lead. (See app/api/flows/data-exchange/route.ts.)
          if (msg?.type === 'interactive' && msg?.interactive?.type === 'nfm_reply') {
            const waId: string = msg?.from ?? ''
            const responseJson: string = msg?.interactive?.nfm_reply?.response_json ?? ''
            if (!waId || !responseJson) continue

            let flow: Record<string, unknown>
            try {
              flow = JSON.parse(responseJson)
            } catch {
              continue
            }

            const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
            const lang = flow.preferred_language === 'ar' ? 'ar' : 'en'

            const fullName = str(flow.full_name) ?? ''
            const nameParts = fullName.split(/\s+/).filter(Boolean)
            const groupSize = Number.parseInt(str(flow.group_size) ?? '', 10)
            const travelDates = str(flow.travel_dates)
            const intake = await ingestEnquiry(admin, {
              channel: 'whatsapp_flow',
              externalEventId: String(msg.id || flow.flow_token || crypto.randomUUID()),
              source: 'whatsapp_flow',
              firstName: nameParts[0] || 'WhatsApp',
              lastName: nameParts.slice(1).join(' '),
              email: str(flow.email)?.toLowerCase() ?? null,
              whatsapp: waId,
              language: lang,
              question: [
                str(flow.special_requests),
                travelDates ? `Travel dates: ${travelDates}` : null,
                str(flow.budget_range) ? `Budget: ${str(flow.budget_range)}` : null,
                str(flow.tour_type) ? `Tour type: ${str(flow.tour_type)}` : null,
              ].filter(Boolean).join('\n'),
              quoteIntent: true,
              adults: Number.isFinite(groupSize) ? groupSize : 1,
            })

            if (!intake.duplicate) await sendWhatsAppMessage(
              waId,
              "Thank you! 🦁 We've received your safari enquiry and our team will get back to you within 24 hours."
            )
            continue
          }

          if (msg?.type !== 'text') continue

          const waId: string = msg?.from ?? ''
          const messageText: string = msg?.text?.body ?? ''
          if (!waId || !messageText) continue

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const contact = contacts.find((c: any) => c?.wa_id === waId) as any
          const profileName: string = contact?.profile?.name?.trim() ?? ''
          const nameParts = profileName.split(' ')
          const firstName = nameParts[0] ?? ''
          const lastName = nameParts.slice(1).join(' ')

          const { data: convo } = await admin
            .from('whatsapp_conversations')
            .select('*')
            .eq('wa_id', waId)
            .maybeSingle()

          if (!convo) {
            // First message — store it and ask for email
            await admin.from('whatsapp_conversations').insert({
              wa_id: waId,
              step: 'awaiting_email',
              collected_name: profileName || null,
              collected_question: messageText,
            })

            const greeting = firstName ? `Hi ${firstName}!` : 'Hi!'
            await sendWhatsAppMessage(
              waId,
              `${greeting} 👋 Welcome to Safari Adventure Tour.\n\nTo help you plan your perfect safari, could you share your email address?`
            )
          } else if (convo.step === 'awaiting_email') {
            const candidateEmail = messageText.trim().toLowerCase()
            if (!isValidEmail(candidateEmail)) {
              await sendWhatsAppMessage(waId, "That doesn't look like a valid email address — could you resend it? (e.g. name@example.com)")
              continue
            }

            await admin
              .from('whatsapp_conversations')
              .update({ collected_email: candidateEmail, step: 'awaiting_country' })
              .eq('wa_id', waId)

            await sendWhatsAppMessage(waId, 'Thanks! Which country are you from?')
          } else if (convo.step === 'awaiting_country') {
            // All info collected — create the same canonical request used by
            // the website and Flow channels.
            const fullName: string = convo.collected_name || profileName || ''
            const np = fullName.split(' ').filter(Boolean)
            // clients.first_name/last_name are NOT NULL — fall back to '' (never null).
            const fn = np[0] || firstName || ''
            const ln = np.slice(1).join(' ') || lastName || ''
            const collectedEmail = convo.collected_email || null

            const intake = await ingestEnquiry(admin, {
              channel: 'whatsapp',
              externalEventId: String(msg.id || crypto.randomUUID()),
              source: 'whatsapp',
              firstName: fn || 'WhatsApp',
              lastName: ln,
              email: collectedEmail,
              whatsapp: waId,
              country: messageText,
              question: convo.collected_question || messageText,
              quoteIntent: false,
              adults: 1,
            })

            await admin
              .from('whatsapp_conversations')
              .update({ collected_country: messageText, step: 'done' })
              .eq('wa_id', waId)

            const thankName = fn ? `, ${fn}` : ''
            if (!intake.duplicate) await sendWhatsAppMessage(
              waId,
              `Thank you${thankName}! 🦁 Our team will review your enquiry and get back to you within 24 hours.`
            )
          } else {
            // Returning client — create a new request directly
            const intake = await ingestEnquiry(admin, {
                channel: 'whatsapp',
                externalEventId: String(msg.id || crypto.randomUUID()),
                source: 'whatsapp',
                firstName: firstName || 'WhatsApp',
                lastName,
                whatsapp: waId,
                question: messageText,
                quoteIntent: false,
                adults: 1,
              })

              if (!intake.duplicate) await sendWhatsAppMessage(
                waId,
                `Thanks for reaching out again! 🦁 Our team will get back to you within 24 hours.`
              )
          }
        }
      }
    }
  } catch {
    // swallow all errors — Meta expects 200 regardless
  }

  return new NextResponse('OK', { status: 200 })
}

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidEmail } from '@/lib/server/validate-client'

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
            // All info collected — create client + request
            const fullName: string = convo.collected_name || profileName || ''
            const np = fullName.split(' ').filter(Boolean)
            // clients.first_name/last_name are NOT NULL — fall back to '' (never null).
            const fn = np[0] || firstName || ''
            const ln = np.slice(1).join(' ') || lastName || ''
            const collectedEmail = convo.collected_email || null

            let clientId: string

            const { data: existingByWhatsapp } = await admin
              .from('clients')
              .select('id')
              .eq('whatsapp', waId)
              .maybeSingle()

            // Also check by email — the same person may have already contacted
            // via the website form, and we don't want a second duplicate client.
            const { data: existingByEmail } = collectedEmail
              ? await admin.from('clients').select('id').ilike('email', collectedEmail).maybeSingle()
              : { data: null }

            const existingClient = existingByWhatsapp ?? existingByEmail

            if (existingClient) {
              clientId = existingClient.id
              await admin
                .from('clients')
                .update({
                  first_name: fn || undefined,
                  last_name: ln || undefined,
                  email: collectedEmail ?? undefined,
                  whatsapp: waId,
                  country: messageText,
                })
                .eq('id', clientId)
            } else {
              const { data: newClient, error } = await admin
                .from('clients')
                .insert({ whatsapp: waId, first_name: fn, last_name: ln, email: collectedEmail, country: messageText })
                .select('id')
                .single()

              if (error || !newClient) continue
              clientId = newClient.id
            }

            await admin.from('requests').insert({
              client_id: clientId,
              source: 'whatsapp',
              client_question: convo.collected_question || messageText,
              stage: 'new',
            })

            await admin
              .from('whatsapp_conversations')
              .update({ collected_country: messageText, step: 'done' })
              .eq('wa_id', waId)

            const thankName = fn ? `, ${fn}` : ''
            await sendWhatsAppMessage(
              waId,
              `Thank you${thankName}! 🦁 Our team will review your enquiry and get back to you within 24 hours.`
            )
          } else {
            // Returning client — create a new request directly
            const { data: existingClient } = await admin
              .from('clients')
              .select('id')
              .eq('whatsapp', waId)
              .maybeSingle()

            if (existingClient) {
              await admin.from('requests').insert({
                client_id: existingClient.id,
                source: 'whatsapp',
                client_question: messageText,
                stage: 'new',
              })

              await sendWhatsAppMessage(
                waId,
                `Thanks for reaching out again! 🦁 Our team will get back to you within 24 hours.`
              )
            }
          }
        }
      }
    }
  } catch {
    // swallow all errors — Meta expects 200 regardless
  }

  return new NextResponse('OK', { status: 200 })
}

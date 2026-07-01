import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await request.json()
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
            await admin
              .from('whatsapp_conversations')
              .update({ collected_email: messageText, step: 'awaiting_country' })
              .eq('wa_id', waId)

            await sendWhatsAppMessage(waId, 'Thanks! Which country are you from?')
          } else if (convo.step === 'awaiting_country') {
            // All info collected — create client + request
            const fullName: string = convo.collected_name || profileName || ''
            const np = fullName.split(' ')
            const fn = np[0] || firstName || null
            const ln = np.slice(1).join(' ') || lastName || null

            let clientId: string

            const { data: existingClient } = await admin
              .from('clients')
              .select('id')
              .eq('whatsapp', waId)
              .maybeSingle()

            if (existingClient) {
              clientId = existingClient.id
              await admin
                .from('clients')
                .update({ first_name: fn, last_name: ln, email: convo.collected_email || null, country: messageText })
                .eq('id', clientId)
            } else {
              const { data: newClient, error } = await admin
                .from('clients')
                .insert({ whatsapp: waId, first_name: fn, last_name: ln, email: convo.collected_email || null, country: messageText })
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

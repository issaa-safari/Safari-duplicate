import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
      const e = entry as any
      const changes: unknown[] = e?.changes ?? []
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

          let clientId: string

          const { data: existingClient } = await admin
            .from('clients')
            .select('id')
            .eq('whatsapp', waId)
            .maybeSingle()

          if (existingClient) {
            clientId = existingClient.id
          } else {
            const { data: newClient, error: clientError } = await admin
              .from('clients')
              .insert({
                whatsapp: waId,
                first_name: firstName || null,
                last_name: lastName || null,
              })
              .select('id')
              .single()

            if (clientError || !newClient) continue
            clientId = newClient.id
          }

          await admin.from('requests').insert({
            client_id: clientId,
            source: 'whatsapp',
            client_question: messageText,
            stage: 'new',
          })
        }
      }
    }
  } catch {
    // swallow all errors — Meta expects 200 regardless
  }

  return new NextResponse('OK', { status: 200 })
}

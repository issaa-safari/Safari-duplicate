import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { SearchQuote, SearchRequest } from '@/lib/types'

// PostgREST returns the embedded relation as an object for a to-one join.
type ClientEmbed = { first_name: string | null; last_name: string | null } | null
type RawQuoteRow = { id: string; quote_number: string | null; status: string; clients: ClientEmbed }
type RawRequestRow = { id: string; reference: string | null; stage: string; clients: ClientEmbed }

const clientName = (c: ClientEmbed) =>
  c ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() : null

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ quotes: [], clients: [], requests: [] })

  const admin = createAdminClient()
  const like = `%${q}%`

  const [{ data: quotesRaw }, { data: clients }, { data: requestsRaw }] = await Promise.all([
    admin.from('quotes')
      .select('id, quote_number, status, client_id, clients(first_name, last_name)')
      .or(`quote_number.ilike.${like}`)
      .limit(6),
    admin.from('clients')
      .select('id, first_name, last_name, email')
      .or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`)
      .limit(6),
    admin.from('requests')
      .select('id, reference, stage, client_id, clients(first_name, last_name)')
      .or(`reference.ilike.${like}`)
      .limit(6),
  ])

  const quotes: SearchQuote[] = ((quotesRaw ?? []) as unknown as RawQuoteRow[]).map((q) => ({
    id: q.id,
    quote_number: q.quote_number,
    status: q.status,
    client_name: clientName(q.clients),
  }))

  const requests: SearchRequest[] = ((requestsRaw ?? []) as unknown as RawRequestRow[]).map((r) => ({
    id: r.id,
    reference: r.reference,
    stage: r.stage,
    client_name: clientName(r.clients),
  }))

  return NextResponse.json({ quotes, clients: clients ?? [], requests })
}

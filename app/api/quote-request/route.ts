import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findOrCreateClientByEmail } from '@/lib/server/clients'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, country, tourType, startDate, duration, groupSize, budget, preferences, heardAboutUs } = body

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Resolve (or create) the client — mandatory before any insert
    let clientId: string
    try {
      clientId = await findOrCreateClientByEmail(admin, {
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
      })
    } catch (err) {
      console.error('[quote-request] client resolution failed', err)
      return NextResponse.json({ error: 'Failed to identify client' }, { status: 500 })
    }

    // Resolve the tour id when the user selected a specific tour
    const tourId: string | null = (tourType && tourType !== 'custom') ? tourType : null

    // Create the request row — this is the CRM intake record with source attribution
    const { data: newRequest, error: requestError } = await admin
      .from('requests')
      .insert({
        client_id: clientId,
        tour_id: tourId,
        stage: 'new',
        source: 'website',
        travelers_adults: groupSize ? parseInt(groupSize) : 1,
        preferred_start_date: startDate || null,
        client_question: preferences || null,
        heard_about_us: heardAboutUs || null,
      })
      .select('id')
      .single()

    if (requestError || !newRequest) {
      console.error('[quote-request] request insert failed', requestError)
      return NextResponse.json({ error: 'Failed to create enquiry' }, { status: 500 })
    }

    // Create a draft quote linked to the request
    const { data: quote, error: quoteError } = await admin
      .from('quotes')
      .insert({
        quote_number: `QR-${Date.now()}`,
        status: 'draft',
        mode: 'custom',
        client_id: clientId,
        request_id: newRequest.id,
        tour_id: tourId,
      })
      .select('id')
      .single()

    if (quoteError || !quote) {
      console.error('[quote-request] quote insert failed', quoteError)
      return NextResponse.json({ error: 'Failed to create quote request' }, { status: 500 })
    }

    return NextResponse.json(
      { success: true, quoteId: quote.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('[quote-request] unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, country, tourType, startDate, duration, groupSize, budget, preferences } = body

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Create a client if they don't exist
    const { data: existingClient } = await admin
      .from('clients')
      .select('id')
      .eq('email', email)
      .single()

    let clientId = existingClient?.id
    if (!clientId) {
      const { data: newClient, error: clientError } = await admin
        .from('clients')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          country,
        })
        .select('id')
        .single()

      if (clientError || !newClient) {
        return NextResponse.json(
          { error: 'Failed to create client' },
          { status: 500 }
        )
      }
      clientId = newClient.id
    }

    // Create a quote request (stored as a quote in draft status)
    const { data: quote, error: quoteError } = await admin
      .from('quotes')
      .insert({
        quote_number: `QR-${Date.now()}`,
        status: 'draft',
        mode: 'custom',
        client_id: clientId,
      })
      .select('id')
      .single()

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Failed to create quote request' },
        { status: 500 }
      )
    }

    // Store quote details
    const { error: detailsError } = await admin
      .from('quote_requests')
      .insert({
        quote_id: quote.id,
        tour_type: tourType,
        start_date: startDate || null,
        duration_days: duration ? parseInt(duration) : null,
        group_size: groupSize ? parseInt(groupSize) : null,
        budget_usd: budget ? parseFloat(budget) : null,
        preferences: preferences || null,
      })
      .single()

    if (detailsError) {
      console.error('Failed to store quote details:', detailsError)
    }

    return NextResponse.json(
      { success: true, quoteId: quote.id },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Quote request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

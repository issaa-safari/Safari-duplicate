import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting test data creation...\n')
    const admin = createAdminClient()

    // Step 1: Create client
    const { data: clientData, error: clientError } = await admin
      .from('clients')
      .insert([
        {
          first_name: 'John',
          last_name: 'Safari-Test',
          email: 'john.safari.test@example.com',
          country: 'United States',
          phone: '+1-555-0123',
          preferred_language: 'en',
        },
      ])
      .select()

    if (clientError) throw clientError
    const clientId = clientData[0].id
    console.log('✓ Step 1: Created client', clientId)

    // Step 2: Create request
    const { data: requestData, error: requestError } = await admin
      .from('requests')
      .insert([
        {
          client_id: clientId,
          requested_for_date: '2025-09-15',
          group_size: 4,
          requested_tour_type: 'wildlife_safari',
          status: 'new',
        },
      ])
      .select()

    if (requestError) throw requestError
    const requestId = requestData[0].id
    console.log('✓ Step 2: Created request', requestId)

    // Step 3: Get or create tour
    let { data: tourData } = await admin
      .from('tours')
      .select('id')
      .ilike('title_en', '%safari%')
      .limit(1)

    let tourId
    if (!tourData || tourData.length === 0) {
      const { data: newTourData } = await admin
        .from('tours')
        .insert([
          {
            title_en: 'Kenya 8-Day Safari Adventure',
            title_ar: 'مغامرة سفاري كينيا لمدة 8 أيام',
            description_en: 'Experience the wildlife and landscapes of Kenya',
            description_ar: 'اختبر الحياة البرية ومناظر كينيا',
            duration_days: 8,
            type: 'wildlife',
            is_active: true,
          },
        ])
        .select()
      tourId = newTourData![0].id
    } else {
      tourId = tourData[0].id
    }
    console.log('✓ Step 3: Using tour', tourId)

    // Step 4: Create quote
    const { data: quoteData, error: quoteError } = await admin
      .from('quotes')
      .insert([
        {
          client_id: clientId,
          request_id: requestId,
          mode: 'custom',
          tour_id: tourId,
          status: 'draft',
        },
      ])
      .select()

    if (quoteError) throw quoteError
    const quoteId = quoteData[0].id
    console.log('✓ Step 4: Created quote', quoteId)

    // Step 5: Get auto-created version
    const { data: versionData } = await admin
      .from('quote_versions')
      .select('id')
      .eq('quote_id', quoteId)
      .order('version_number', { ascending: false })
      .limit(1)

    const versionId = versionData![0].id
    console.log('✓ Step 5: Got quote version', versionId)

    // Step 6: Update quote version with pricing
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + 30)

    const { error: updateError } = await admin
      .from('quote_versions')
      .update({
        travel_start_date: '2025-09-15',
        travel_end_date: '2025-09-22',
        valid_until: validUntil.toISOString().split('T')[0],
        language: 'en',
        title: 'Kenya 8-Day Safari - Test Quote',
        cost_base_usd: 5000.00,
        default_markup_percent: 40,
        total_selling_usd: 7000.00,
        sharing_price_per_person_usd: 1750.00,
        single_price_per_person_usd: 2100.00,
      })
      .eq('id', versionId)

    if (updateError) throw updateError
    console.log('✓ Step 6: Updated pricing - Cost: $5,000 + 40% markup = $7,000')

    // Step 7: Get adult age band
    const { data: ageBandData } = await admin
      .from('traveller_age_bands')
      .select('id')
      .eq('code', 'adult')
      .limit(1)

    const ageBandId = ageBandData![0].id

    const travellers = [
      { name: 'John Test', age: 35, room: 'sharing' },
      { name: 'Jane Test', age: 35, room: 'sharing' },
      { name: 'Bob Test Jr', age: 12, room: 'sharing' },
      { name: 'Alice Test', age: 35, room: 'single' },
    ]

    const travellerInserts = travellers.map((t, i) => ({
      quote_version_id: versionId,
      display_name: t.name,
      age_on_travel_date: t.age,
      age_band_id: ageBandId,
      age_band_snapshot: {
        id: ageBandId,
        name: 'Adult',
        code: 'adult',
        min_age: 16,
        max_age: null,
        default_pricing_method: 'percentage',
        default_percentage: 100,
      },
      traveller_category: 'adult',
      room_category: t.room,
      is_paying: true,
      is_complimentary: false,
      sort_order: i + 1,
    }))

    const { error: travellerError } = await admin
      .from('quote_travellers')
      .insert(travellerInserts)

    if (travellerError) throw travellerError
    console.log('✓ Step 7: Added 4 travellers (3 sharing, 1 single)')

    // Step 8: Create or get destination
    const { data: destData } = await admin
      .from('destinations')
      .select('id')
      .eq('name', 'Nairobi')
      .eq('country', 'Kenya')
      .limit(1)

    let destinationId
    if (!destData || destData.length === 0) {
      const { data: newDest } = await admin
        .from('destinations')
        .insert([
          {
            name: 'Nairobi',
            country: 'Kenya',
            is_active: true,
            has_content: true,
          },
        ])
        .select()
      destinationId = newDest![0].id
    } else {
      destinationId = destData[0].id
    }

    const dayTitles = [
      'Arrival in Nairobi',
      'Nairobi National Park',
      'Drive to Lake Naivasha',
      'Lake Naivasha Activities',
      'Nakuru National Park',
      'Great Rift Valley',
      'Return to Nairobi',
      'Departure',
    ]

    const dayDescriptions = [
      'Welcome to Kenya. Airport transfer and check-in.',
      'Full day game drive in Nairobi National Park.',
      'Scenic drive to Lake Naivasha with stopover.',
      'Boat ride and bird watching at Lake Naivasha.',
      'Lake Nakuru National Park - famous for flamingos.',
      'Scenic views and wildlife viewing.',
      'Return journey to Nairobi.',
      'Checkout and airport transfer.',
    ]

    const dayInserts = dayTitles.map((title, i) => {
      const dayDate = new Date('2025-09-15')
      dayDate.setDate(dayDate.getDate() + i)
      return {
        quote_version_id: versionId,
        day_number: i + 1,
        day_date: dayDate.toISOString().split('T')[0],
        title,
        description_en: dayDescriptions[i],
        destination_id: destinationId,
        destination_snapshot: {
          id: destinationId,
          name: 'Nairobi',
          country: 'Kenya',
        },
        meals: i === 0 ? ['L', 'D'] : i === 7 ? ['B'] : ['B', 'L', 'D'],
        sort_order: i + 1,
      }
    })

    const { error: dayError } = await admin
      .from('quote_days')
      .insert(dayInserts)

    if (dayError) throw dayError
    console.log('✓ Step 8: Added 8 itinerary days')

    // Step 9: Add price lines
    const priceLines = [
      {
        description: 'Accommodation (7 nights, 3-4 star lodges)',
        cost_category: 'accommodation',
        pricing_unit: 'night',
        quantity: 7,
        unit_cost_usd: 300,
        markup_percent_override: 30,
        total_cost_usd: 2100.00,
        total_selling_usd: 2730.00,
        is_optional: false,
        is_client_visible: true,
        sort_order: 1,
      },
      {
        description: 'National Park Entrance Fees',
        cost_category: 'park_fees',
        pricing_unit: 'person',
        quantity: 4,
        unit_cost_usd: 150,
        markup_percent_override: 30,
        total_cost_usd: 600.00,
        total_selling_usd: 780.00,
        is_optional: false,
        is_client_visible: true,
        sort_order: 2,
      },
      {
        description: 'Professional Game Drive Guides (8 days)',
        cost_category: 'transport',
        pricing_unit: 'day',
        quantity: 8,
        unit_cost_usd: 100,
        markup_percent_override: 30,
        total_cost_usd: 800.00,
        total_selling_usd: 1040.00,
        is_optional: false,
        is_client_visible: true,
        sort_order: 3,
      },
      {
        description: 'Meals & Beverages (as per itinerary)',
        cost_category: 'meals',
        pricing_unit: 'person',
        quantity: 4,
        unit_cost_usd: 50,
        markup_percent_override: 30,
        total_cost_usd: 200.00,
        total_selling_usd: 260.00,
        is_optional: false,
        is_client_visible: true,
        sort_order: 4,
      },
      {
        description: 'Balloon Safari Adventure (OPTIONAL)',
        cost_category: 'activities',
        pricing_unit: 'person',
        quantity: 4,
        unit_cost_usd: 150,
        markup_percent_override: 30,
        total_cost_usd: 600.00,
        total_selling_usd: 780.00,
        is_optional: true,
        is_client_visible: true,
        sort_order: 5,
      },
    ]

    const priceLineInserts = priceLines.map(line => ({
      quote_version_id: versionId,
      ...line,
    }))

    const { error: priceLineError } = await admin
      .from('quote_price_lines')
      .insert(priceLineInserts)

    if (priceLineError) throw priceLineError
    console.log('✓ Step 9: Added 5 price line items (1 optional)')

    // Step 10: Create quote delivery
    const accessToken = 'test-' + Math.random().toString(36).substr(2, 20)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { error: deliveryError } = await admin
      .from('quote_deliveries')
      .insert([
        {
          quote_id: quoteId,
          quote_version_id: versionId,
          access_token: accessToken,
          expires_at: expiresAt.toISOString().split('T')[0],
          revoked_at: null,
        },
      ])

    if (deliveryError) throw deliveryError
    console.log('✓ Step 10: Created quote delivery with access token')

    const result = {
      success: true,
      message: 'Test quotation created successfully',
      data: {
        clientId,
        requestId,
        quoteId,
        versionId,
        accessToken,
        pdfUrl: `/quote/${accessToken}/print`,
        adminUrl: `/admin/quotes/${quoteId}/versions/${versionId}`,
        pricing: {
          costBase: 5000.00,
          markupPercent: 40,
          markupAmount: 2000.00,
          clientPrice: 7000.00,
          perPersonSharing: 1750.00,
          perPersonSingle: 2100.00,
        },
      },
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Error creating test data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create test data' },
      { status: 500 }
    )
  }
}

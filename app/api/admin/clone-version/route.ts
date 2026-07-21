import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { syncQuoteStatus } from '@/lib/server/quote-status'

// Cloning a version that is out with the client (sent/viewed) means "revise
// and re-send it": supersede the source so the parent quote rolls back to the
// new editable draft. Accepted/declined/expired versions are deliberately NOT
// superseded — an accepted version is tied to a booking (quotes.accepted_version_id)
// and silently un-accepting the quote would desync that state; the clone is
// still created for reference, the source's standing is left untouched.
const SUPERSEDE_ON_CLONE = ['sent', 'viewed']

// Clone a quote version (any status) into a new editable draft: the version
// row (minus identity/lifecycle columns — keeps builder_state, inclusions,
// language, cost base…), price lines, travellers, and days + day items.
//
// A plain API route + client-side hard navigation, deliberately not a server
// action: the action's redirect/refresh responses were dropped by the client
// router in production, leaving the admin stuck on the old version until a
// manual refresh.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  try {
    await assertAdminAccess(admin, user.email)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { quoteId, versionId } = await request.json().catch(() => ({}))
  if (!quoteId || !versionId) {
    return NextResponse.json({ error: 'quoteId and versionId are required.' }, { status: 400 })
  }

  try {
    // Load source version
    const { data: src } = await admin.from('quote_versions')
      .select('*').eq('id', versionId).eq('quote_id', quoteId).single()
    if (!src) throw new Error('Version not found.')

    // Get next version number
    const { data: latest } = await admin.from('quote_versions')
      .select('version_number').eq('quote_id', quoteId)
      .order('version_number', { ascending: false }).limit(1).single()
    const nextNum = (latest?.version_number ?? 0) + 1

    // Create new version as draft. Copy the whole row except identity/lifecycle
    // columns so nothing the admin filled in is lost — notably builder_state
    // (the saved Pricing form), inclusions/exclusions, language, and cost base.
    const {
      id: _srcId,
      quote_id: _srcQuoteId,
      version_number: _srcVersionNumber,
      status: _srcStatus,
      title: srcTitle,
      created_at: _srcCreatedAt,
      updated_at: _srcUpdatedAt,
      sent_at: _srcSentAt,
      locked_at: _srcLockedAt,
      accepted_at: _srcAcceptedAt,
      created_by: _srcCreatedBy,
      ...srcRest
    } = src
    const { data: newVersion, error: vErr } = await admin.from('quote_versions').insert({
      ...srcRest,
      quote_id: quoteId,
      version_number: nextNum,
      status: 'draft',
      title: srcTitle ? `${srcTitle} (copy)` : null,
    }).select('id').single()
    if (vErr || !newVersion) throw new Error(vErr?.message ?? 'Failed to create version.')

    const newId = newVersion.id

    // Clone price lines
    const { data: lines } = await admin.from('quote_price_lines')
      .select('*').eq('quote_version_id', versionId)
    if (lines?.length) {
      const { error: lErr } = await admin.from('quote_price_lines').insert(
        lines.map(({ id: _, quote_version_id: __, ...rest }: Record<string, unknown>) => ({
          ...rest, quote_version_id: newId,
        }))
      )
      if (lErr) throw new Error(`Failed to copy price lines: ${lErr.message}`)
    }

    // Clone travellers
    const { data: travellers } = await admin.from('quote_travellers')
      .select('*').eq('quote_version_id', versionId)
    if (travellers?.length) {
      const { error: tErr } = await admin.from('quote_travellers').insert(
        travellers.map(({ id: _, quote_version_id: __, ...rest }: Record<string, unknown>) => ({
          ...rest, quote_version_id: newId,
        }))
      )
      if (tErr) throw new Error(`Failed to copy travellers: ${tErr.message}`)
    }

    // Clone days + day items
    const { data: days } = await admin.from('quote_days')
      .select('*').eq('quote_version_id', versionId).order('sort_order')
    if (days?.length) {
      for (const { id: dayId, quote_version_id: __, ...dayRest } of days as Record<string, unknown>[]) {
        const { data: newDay, error: dayErr } = await admin.from('quote_days')
          .insert({ ...dayRest, quote_version_id: newId }).select('id').single()
        // A copy that silently loses its itinerary is worse than a failed copy.
        if (dayErr || !newDay) throw new Error(`Failed to copy itinerary day: ${dayErr?.message ?? 'unknown error'}`)
        const { data: items } = await admin.from('quote_day_items')
          .select('*').eq('quote_day_id', dayId as string)
        if (items?.length) {
          const { error: itemErr } = await admin.from('quote_day_items').insert(
            items.map(({ id: _, quote_day_id: ___, ...iRest }: Record<string, unknown>) => ({
              ...iRest, quote_day_id: newDay.id,
            }))
          )
          if (itemErr) throw new Error(`Failed to copy day items: ${itemErr.message}`)
        }
      }
    }

    // Revising a sent/viewed version: supersede the source so the parent
    // quote's status rolls back to the new draft (via the STATUS_RANK rollup)
    // and the clone becomes fully editable — otherwise save_trip refuses
    // pricing edits because the quote is still 'sent'/'viewed'. The source's
    // existing share link stays viewable (gated on the delivery, not the
    // version status). Draft/ready/accepted/etc. sources are left untouched.
    if (SUPERSEDE_ON_CLONE.includes(src.status)) {
      await admin.from('quote_versions').update({ status: 'superseded' }).eq('id', versionId)
    }
    // Keep quotes.status a true reflection of its versions (adds the new draft;
    // reflects the supersede above). No-op when nothing changed the ranking.
    await syncQuoteStatus(admin, quoteId)

    return NextResponse.json({ url: `/admin/quotes/${quoteId}?step=itinerary&version=${newId}` })
  } catch (err) {
    console.error('[clone-version]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to clone version.' },
      { status: 500 },
    )
  }
}

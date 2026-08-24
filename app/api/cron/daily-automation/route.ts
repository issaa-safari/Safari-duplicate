import { createAdminClient } from '@/lib/supabase/admin'
import { shouldComplete, shouldArchive, shouldDelete, shouldExpireQuote, type AutomationSettings } from '@/lib/automation'
import { syncQuoteStatus } from '@/lib/server/quote-status'
import { sendEmail } from '@/lib/email'
import { buildAgreementEmail } from '@/lib/agreement-email'
import { site } from '@/lib/site'
import { ensureProposalFollowUpTask } from '@/lib/server/proposal-follow-up'
import { ensureWorkflowTask } from '@/lib/server/workflow-task'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface ReadinessPayment {
  amount_usd: number | null
  status: string
}

interface ReadinessAgreement {
  status: string
}

interface ReadinessTraveller {
  first_name: string | null
  last_name: string | null
  passport_number: string | null
  traveller_agreements: ReadinessAgreement[]
}

interface ReadinessBooking {
  id: string
  request_id: string | null
  total_price_usd: number | null
  status: string
  booking_payments: ReadinessPayment[]
  booking_travellers: ReadinessTraveller[]
}

interface ReadinessDeparture {
  id: string
  bookings: ReadinessBooking[]
  hotel_vouchers: Array<{ status: string }>
}

interface AgreementReminderRow {
  id: string
  access_token: string | null
  language_snapshot: string | null
  last_emailed_at: string | null
  reminder_count: number | null
  booking_travellers: {
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
  departures: {
    tours: { title_en: string | null } | null
  } | null
}

// Daily request-lifecycle automation, driven by a Vercel Cron Job (see
// vercel.json). Vercel sends `Authorization: Bearer ${CRON_SECRET}` automatically
// when CRON_SECRET is set in the project env. All writes use the service-role
// client. Safe to run repeatedly — every step is idempotent.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const admin = createAdminClient()
  const now = new Date()

  const { data: settings } = await admin
    .from('company_settings')
    .select('auto_complete_on_end_date, auto_expire_quotes, auto_archive_enabled, auto_archive_days, auto_archive_stages, auto_delete_enabled, auto_delete_days, request_proposal_due_hours, proposal_expiry_warning_days, operations_readiness_window_days')
    .limit(1)
    .single()

  if (!settings) return NextResponse.json({ error: 'No company settings' }, { status: 500 })
  const s = settings as AutomationSettings
  const workflowSettings = settings as typeof settings & {
    request_proposal_due_hours: number
    proposal_expiry_warning_days: number
    operations_readiness_window_days: number
  }

  const result = {
    completed: 0,
    expired: 0,
    proposalFollowUps: 0,
    archived: 0,
    deleted: 0,
    agreementReminders: 0,
    requestsNeedingProposal: 0,
    proposalExpiryWarnings: 0,
    acceptedHandoffs: 0,
    travellerReadinessTasks: 0,
    agreementTasks: 0,
    paymentTasks: 0,
    voucherTasks: 0,
  }

  async function logSystem(requestId: string, summary: string) {
    try {
      await admin.from('communication_logs').insert({ request_id: requestId, type: 'note', summary })
    } catch { /* audit note is non-critical */ }
  }

  // 1) Auto-complete booked trips whose end date has passed.
  if (s.auto_complete_on_end_date) {
    const { data: booked } = await admin
      .from('quotes')
      .select('request_id, quote_versions!quote_versions_quote_id_fkey!inner(travel_end_date, status)')
      .not('request_id', 'is', null)
      .in('status', ['accepted'])
    const seen = new Set<string>()
    for (const q of booked ?? []) {
      const rid = (q as { request_id: string }).request_id
      if (!rid || seen.has(rid)) continue
      const versions = (q as { quote_versions: { travel_end_date: string | null; status: string }[] }).quote_versions ?? []
      const end = versions.find(v => v.status === 'accepted')?.travel_end_date ?? versions[0]?.travel_end_date
      if (shouldComplete(end, now)) {
        const { data: reqRow } = await admin.from('requests').select('stage').eq('id', rid).single()
        if (reqRow?.stage === 'booked') {
          await admin.from('requests').update({ stage: 'completed' }).eq('id', rid)
          await logSystem(rid, 'Auto-completed: trip end date passed.')
          seen.add(rid)
          result.completed++
        }
      }
    }
  }

  // 2) Expire quotes the client was sent and never answered, once the date on
  //    them has passed. Only 'sent' and 'viewed' qualify — see shouldExpireQuote.
  if (s.auto_expire_quotes) {
    const { data: live } = await admin
      .from('quote_versions')
      .select('id, quote_id, status, valid_until')
      .in('status', ['sent', 'viewed'])
      .not('valid_until', 'is', null)

    const touchedQuotes = new Set<string>()
    for (const v of (live ?? [])) {
      const row = v as { id: string; quote_id: string; status: string; valid_until: string | null }
      if (!shouldExpireQuote(row.status, row.valid_until, s, now)) continue

      const { error } = await admin
        .from('quote_versions').update({ status: 'expired' }).eq('id', row.id)
      if (error) continue

      touchedQuotes.add(row.quote_id)
      result.expired++
    }

    // The list tabs read quotes.status, which only tracks the most-advanced
    // version — so it has to be recomputed, not assumed to follow.
    for (const quoteId of touchedQuotes) {
      try { await syncQuoteStatus(admin, quoteId) } catch { /* parent sync is best-effort */ }
    }
  }

  // 3) Ensure every sent/viewed proposal has one visible request follow-up.
  // This also backfills proposals sent before this automation was introduced.
  {
    const { data: proposals } = await admin
      .from('quotes')
      .select('id, request_id, quote_number, status')
      .not('request_id', 'is', null)
      .in('status', ['sent', 'viewed'])

    for (const proposal of proposals ?? []) {
      try {
        const created = await ensureProposalFollowUpTask(admin, {
          requestId: proposal.request_id,
          quoteId: proposal.id,
          quoteNumber: proposal.quote_number,
          status: proposal.status,
          referenceDate: now,
        })
        if (created) result.proposalFollowUps++
      } catch (error) {
        console.error('[cron] proposal follow-up task failed', error)
      }
    }
  }

  // 4) Create a visible owner task when a live request has remained unquoted.
  {
    const cutoff = new Date(now.getTime() - workflowSettings.request_proposal_due_hours * 3_600_000).toISOString()
    const { data: unquoted } = await admin
      .from('requests')
      .select('id, reference, handled_by, priority, quotes ( id )')
      .in('stage', ['new', 'working_on', 'open', 'pre_booked'])
      .is('archived_at', null)
      .lt('created_at', cutoff)

    for (const request of unquoted ?? []) {
      if ((request.quotes ?? []).length > 0) continue
      try {
        const created = await ensureWorkflowTask(admin, {
          automationKey: `request_proposal_due:${request.id}`,
          requestId: request.id,
          ownerId: request.handled_by,
          title: `Create proposal for ${request.reference}`,
          priority: request.priority === 'urgent' ? 'urgent' : 'high',
          dueDate: now.toISOString().slice(0, 10),
          sortOrder: -20,
        })
        if (created) result.requestsNeedingProposal++
      } catch (error) {
        console.error('[cron] request proposal task failed', error)
      }
    }
  }

  // 5) Warn before a live proposal expires so the owner can contact the client.
  {
    const today = now.toISOString().slice(0, 10)
    const warningEnd = new Date(now)
    warningEnd.setUTCDate(warningEnd.getUTCDate() + workflowSettings.proposal_expiry_warning_days)
    const { data: versions } = await admin
      .from('quote_versions')
      .select('id, valid_until, quotes!inner ( id, quote_number, request_id, owner_id, status )')
      .in('status', ['sent', 'viewed'])
      .gte('valid_until', today)
      .lte('valid_until', warningEnd.toISOString().slice(0, 10))

    for (const version of versions ?? []) {
      const quote = Array.isArray(version.quotes) ? version.quotes[0] : version.quotes
      if (!quote || !version.valid_until) continue
      try {
        const created = await ensureWorkflowTask(admin, {
          automationKey: `proposal_expiry:${quote.id}:${version.id}`,
          requestId: quote.request_id,
          quoteId: quote.id,
          ownerId: quote.owner_id,
          title: `Follow up before proposal ${quote.quote_number} expires`,
          priority: 'high',
          dueDate: version.valid_until,
          sortOrder: -10,
        })
        if (created) result.proposalExpiryWarnings++
      } catch (error) {
        console.error('[cron] proposal expiry task failed', error)
      }
    }
  }

  // 6) Every accepted proposal receives one explicit Operations handoff task.
  {
    const { data: accepted } = await admin
      .from('quotes')
      .select('id, quote_number, request_id, owner_id, departure_id, provisional_booking_id')
      .eq('status', 'accepted')
      .or('is_template.is.null,is_template.eq.false')

    for (const quote of accepted ?? []) {
      try {
        const created = await ensureWorkflowTask(admin, {
          automationKey: `accepted_handoff:${quote.id}`,
          requestId: quote.request_id,
          quoteId: quote.id,
          departureId: quote.departure_id,
          bookingId: quote.provisional_booking_id,
          ownerId: quote.owner_id,
          title: `Review accepted proposal ${quote.quote_number} handoff`,
          priority: quote.departure_id ? 'normal' : 'urgent',
          dueDate: now.toISOString().slice(0, 10),
          sortOrder: -30,
        })
        if (created) result.acceptedHandoffs++
      } catch (error) {
        console.error('[cron] accepted handoff task failed', error)
      }
    }
  }

  // 7) Drive trip readiness only inside the configured pre-departure window.
  {
    const today = now.toISOString().slice(0, 10)
    const readinessEnd = new Date(now)
    readinessEnd.setUTCDate(readinessEnd.getUTCDate() + workflowSettings.operations_readiness_window_days)
    const { data: departures } = await admin
      .from('departures')
      .select(`
        id, start_date,
        hotel_vouchers ( id, status ),
        bookings (
          id, request_id, total_price_usd, status,
          booking_payments ( amount_usd, status ),
          booking_travellers (
            id, first_name, last_name, passport_number,
            traveller_agreements ( status )
          )
        )
      `)
      .eq('is_active', true)
      .gte('start_date', today)
      .lte('start_date', readinessEnd.toISOString().slice(0, 10))

    for (const departureData of departures ?? []) {
      const departure = departureData as unknown as ReadinessDeparture
      const bookings = departure.bookings.filter(booking => booking.status !== 'cancelled')
      const travellers = bookings.flatMap(booking => booking.booking_travellers)
      const missingDetails = travellers.filter(traveller =>
        !traveller.first_name || !traveller.last_name || !traveller.passport_number,
      ).length
      const unsigned = travellers.filter(traveller =>
        !traveller.traveller_agreements.some(agreement => agreement.status === 'signed'),
      ).length

      if (missingDetails > 0) {
        const created = await ensureWorkflowTask(admin, {
          automationKey: `traveller_readiness:${departure.id}`,
          departureId: departure.id,
          title: `Complete details for ${missingDetails} traveller${missingDetails === 1 ? '' : 's'}`,
          priority: 'high',
          dueDate: today,
          sortOrder: -20,
        }).catch(error => { console.error('[cron] traveller readiness task failed', error); return false })
        if (created) result.travellerReadinessTasks++
      }

      if (unsigned > 0) {
        const created = await ensureWorkflowTask(admin, {
          automationKey: `agreement_readiness:${departure.id}`,
          departureId: departure.id,
          title: `Chase ${unsigned} unsigned traveller agreement${unsigned === 1 ? '' : 's'}`,
          priority: 'high',
          dueDate: today,
          sortOrder: -15,
        }).catch(error => { console.error('[cron] agreement task failed', error); return false })
        if (created) result.agreementTasks++
      }

      for (const booking of bookings) {
        const paid = (booking.booking_payments ?? [])
          .filter(payment => payment.status === 'paid')
          .reduce((sum, payment) => sum + Number(payment.amount_usd ?? 0), 0)
        const outstanding = Math.max(0, Number(booking.total_price_usd ?? 0) - paid)
        if (outstanding <= 0) continue
        const created = await ensureWorkflowTask(admin, {
          automationKey: `payment_readiness:${booking.id}`,
          requestId: booking.request_id,
          departureId: departure.id,
          bookingId: booking.id,
          title: `Collect outstanding booking balance of $${Math.round(outstanding).toLocaleString('en-US')}`,
          type: 'payment',
          priority: 'high',
          dueDate: today,
          sortOrder: -25,
        }).catch(error => { console.error('[cron] payment task failed', error); return false })
        if (created) result.paymentTasks++
      }

      const openVouchers = departure.hotel_vouchers.filter(voucher =>
        voucher.status !== 'confirmed' && voucher.status !== 'cancelled',
      ).length
      const vouchersMissing = bookings.length > 0 && departure.hotel_vouchers.length === 0
      if (vouchersMissing || openVouchers > 0) {
        const created = await ensureWorkflowTask(admin, {
          automationKey: `voucher_readiness:${departure.id}`,
          departureId: departure.id,
          title: vouchersMissing
            ? 'Prepare hotel vouchers for this trip'
            : `Confirm ${openVouchers} outstanding hotel voucher${openVouchers === 1 ? '' : 's'}`,
          type: 'accommodation',
          priority: 'high',
          dueDate: today,
          sortOrder: -10,
        }).catch(error => { console.error('[cron] voucher task failed', error); return false })
        if (created) result.voucherTasks++
      }
    }
  }

  // 8) Auto-archive stale requests in the configured stages.
  if (s.auto_archive_enabled) {
    const { data: candidates } = await admin
      .from('requests')
      .select('id, stage, status_changed_at')
      .in('stage', s.auto_archive_stages ?? [])
    for (const r of candidates ?? []) {
      const row = r as { id: string; stage: string; status_changed_at: string | null }
      if (shouldArchive(row.stage, row.status_changed_at, s, now)) {
        await admin.from('requests').update({ stage: 'archived' }).eq('id', row.id)
        await logSystem(row.id, `Auto-archived: no activity for ${s.auto_archive_days}+ days.`)
        result.archived++
      }
    }
  }

  // 9) Hard-delete requests archived past the delete threshold.
  if (s.auto_delete_enabled) {
    const { data: archived } = await admin
      .from('requests')
      .select('id, archived_at')
      .eq('stage', 'archived')
      .not('archived_at', 'is', null)
    for (const r of archived ?? []) {
      const row = r as { id: string; archived_at: string | null }
      if (shouldDelete(row.archived_at, s, now)) {
        await admin.from('requests').delete().eq('id', row.id)
        result.deleted++
      }
    }
  }

  // 10) Chase unsigned traveller agreements for upcoming departures.
  // Re-send the signing link if it hasn't been emailed in the last 3 days,
  // up to 3 reminders per agreement. Best-effort — never fails the cron.
  {
    const REMINDER_GAP_DAYS = 3
    const MAX_REMINDERS = 3
    const todayIso = now.toISOString().slice(0, 10)
    const { data: pending } = await admin
      .from('traveller_agreements')
      .select(`
        id, access_token, language_snapshot, last_emailed_at, reminder_count,
        booking_travellers ( first_name, last_name, email ),
        departures!inner ( start_date, tours ( title_en ) )
      `)
      .eq('status', 'pending')
      .gte('departures.start_date', todayIso)

    for (const agreement of pending ?? []) {
      const row = agreement as unknown as AgreementReminderRow
      const traveller = row.booking_travellers
      const email = traveller?.email?.trim()
      const token = row.access_token
      if (!email || !token || !traveller) continue
      if ((row.reminder_count ?? 0) >= MAX_REMINDERS) continue
      if (row.last_emailed_at) {
        const ageMs = now.getTime() - new Date(row.last_emailed_at).getTime()
        if (ageMs < REMINDER_GAP_DAYS * 86_400_000) continue
      }
      const { subject, html } = buildAgreementEmail({
        travellerName: `${traveller.first_name ?? ''} ${traveller.last_name ?? ''}`.trim() || 'traveller',
        tourTitle: row.departures?.tours?.title_en ?? null,
        url: `${site.url}/agreement/${token}`,
        language: row.language_snapshot,
        isReminder: true,
      })
      const sent = await sendEmail({ to: email, subject, html })
      if (sent) {
        await admin.from('traveller_agreements')
          .update({ last_emailed_at: now.toISOString(), reminder_count: (row.reminder_count ?? 0) + 1 })
          .eq('id', row.id)
        result.agreementReminders++
      }
    }
  }

  return NextResponse.json({ ok: true, ...result })
}

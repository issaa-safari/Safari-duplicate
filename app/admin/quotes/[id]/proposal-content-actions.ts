'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { assertAdminAccess } from '@/lib/auth/admin-access'
import { safeAction } from '@/lib/server/action-result'
import { logActivity } from '@/lib/server/audit'

// Editing the prose a proposal is built from, at the Preview step.
//
// The client proposal looks its destination / hotel / activity descriptions up
// live in the Content library at render time. A library record with no
// description renders a blank section, which is what this screen exists to
// fill. Day-level copy is not edited here — it belongs to the itinerary step.
//
// Each field is saved one of two ways:
//   'library'  — write the Content library record, so every future proposal
//                that uses it inherits the text. Also rewrites proposals
//                already sent that reference the same record.
//   'proposal' — write a per-quote override, leaving the library untouched.
//                Day copy lives in its own quote_days columns; destination,
//                hotel and activity overrides ride in the jsonb snapshot
//                columns that exist for exactly this purpose.
//
// Language follows the version: an Arabic proposal writes the `_ar` column,
// an English one writes `_en`. We never write the language the proposal is
// not in, so translating is a deliberate act rather than a side effect.

export type SaveTarget = 'library' | 'proposal'

export type ContentField =
  | { kind: 'destination'; quoteDayId: string; destinationId: string | null }
  | { kind: 'accommodation'; itemId: string; accommodationId: string | null }
  | { kind: 'activity'; itemId: string; activityId: string | null }

export interface ContentEdit {
  field: ContentField
  target: SaveTarget
  value: string
}

async function authGuard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Your session has expired — please log in again.')
  const admin = createAdminClient()
  await assertAdminAccess(admin, user.email)
  return { user, admin }
}

/** Merge one key into an existing jsonb snapshot without dropping the rest. */
async function patchSnapshot(
  admin: ReturnType<typeof createAdminClient>,
  table: 'quote_days' | 'quote_day_items',
  column: 'destination_snapshot' | 'content_snapshot',
  rowId: string,
  key: string,
  value: string | null,
) {
  const { data: row, error: readErr } = await admin
    .from(table).select(column).eq('id', rowId).single()
  if (readErr || !row) throw new Error('That itinerary row no longer exists — reload and try again.')

  const current = ((row as Record<string, unknown>)[column] ?? {}) as Record<string, unknown>
  const next = { ...current }
  if (value === null) delete next[key]
  else next[key] = value

  const { error } = await admin
    .from(table).update({ [column]: next, updated_at: new Date().toISOString() }).eq('id', rowId)
  if (error) throw new Error(error.message)
}

export const saveProposalContent = safeAction(async (
  quoteId: string,
  versionId: string,
  edits: ContentEdit[],
): Promise<{ error: null; saved: number }> => {
  const { user, admin } = await authGuard()

  const { data: version, error: vErr } = await admin
    .from('quote_versions')
    .select('id, status, language')
    .eq('id', versionId)
    .eq('quote_id', quoteId)
    .single()
  if (vErr || !version) throw new Error('Quote version not found.')
  if (!['draft', 'ready'].includes(version.status)) {
    throw new Error('This quote version is locked and cannot be changed.')
  }

  const isAr = version.language === 'ar'
  // The column this proposal's language writes into.
  const descCol = isAr ? 'description_ar' : 'description_en'
  const snapshotKey = isAr ? 'description_ar' : 'description_en'

  // Blank means "no override" rather than "an empty description", so the
  // proposal falls back to the library instead of rendering nothing.
  const clean = (v: string) => {
    const t = v.trim()
    return t.length > 0 ? t : null
  }

  let saved = 0
  const touchedLibrary: string[] = []

  for (const edit of edits) {
    const value = clean(edit.value)
    const f = edit.field

    if (f.kind === 'destination') {
      if (edit.target === 'library') {
        if (!f.destinationId) throw new Error('This day has no destination to save a library description to.')
        const { error } = await admin.from('destinations')
          .update({ [descCol]: value, updated_at: new Date().toISOString() })
          .eq('id', f.destinationId)
        if (error) throw new Error(error.message)
        touchedLibrary.push(`destination:${f.destinationId}`)
      } else {
        await patchSnapshot(admin, 'quote_days', 'destination_snapshot', f.quoteDayId, snapshotKey, value)
      }
      saved++
      continue
    }

    if (f.kind === 'accommodation') {
      if (edit.target === 'library') {
        if (!f.accommodationId) throw new Error('This stay is not linked to a Content library record.')
        const { error } = await admin.from('accommodations')
          .update({ [descCol]: value, updated_at: new Date().toISOString() })
          .eq('id', f.accommodationId)
        if (error) throw new Error(error.message)
        touchedLibrary.push(`accommodation:${f.accommodationId}`)
      } else {
        await patchSnapshot(admin, 'quote_day_items', 'content_snapshot', f.itemId, snapshotKey, value)
      }
      saved++
      continue
    }

    if (f.kind === 'activity') {
      if (edit.target === 'library') {
        if (!f.activityId) throw new Error('This activity is not linked to a Content library record.')
        const { error } = await admin.from('activities')
          .update({ [descCol]: value, updated_at: new Date().toISOString() })
          .eq('id', f.activityId)
        if (error) throw new Error(error.message)
        touchedLibrary.push(`activity:${f.activityId}`)
      } else {
        await patchSnapshot(admin, 'quote_day_items', 'content_snapshot', f.itemId, snapshotKey, value)
      }
      saved++
    }
  }

  await logActivity(admin, {
    entityType: 'quote',
    entityId: quoteId,
    action: 'proposal_content_edited',
    summary: `Edited ${saved} proposal field${saved === 1 ? '' : 's'} (${isAr ? 'Arabic' : 'English'})`,
    actorId: user.id,
    actorEmail: user.email ?? null,
    metadata: { versionId, saved, libraryRecords: touchedLibrary },
  })

  revalidatePath(`/admin/quotes/${quoteId}`)
  return { error: null, saved }
})

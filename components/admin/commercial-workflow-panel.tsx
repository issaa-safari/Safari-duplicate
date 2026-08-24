import { updateCommercialWorkflow } from '@/app/admin/workflow-actions'

type TeamMember = {
  id: string
  full_name: string | null
  email: string
}

type WorkflowValue = {
  ownerId: string | null
  priority?: string | null
  nextAction: string | null
  nextActionDueAt: string | null
  lastContactAt: string | null
  followUpOutcome: string | null
}

function localDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function CommercialWorkflowPanel({
  entityType,
  entityId,
  value,
  team,
  compact = false,
}: {
  entityType: 'request' | 'quote'
  entityId: string
  value: WorkflowValue
  team: TeamMember[]
  compact?: boolean
}) {
  return (
    <form action={updateCommercialWorkflow} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">Next commercial action</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Keep ownership and follow-up visible to the whole team.</p>
      </div>

      <div className={compact ? 'space-y-3' : 'grid gap-3 sm:grid-cols-2'}>
        <label className="text-xs font-medium text-muted-foreground">
          Owner
          <select name="ownerId" defaultValue={value.ownerId ?? ''} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground">
            <option value="">Unassigned</option>
            {team.map(member => (
              <option key={member.id} value={member.id}>{member.full_name || member.email}</option>
            ))}
          </select>
        </label>

        {entityType === 'request' && (
          <label className="text-xs font-medium text-muted-foreground">
            Priority
            <select name="priority" defaultValue={value.priority ?? 'normal'} className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground">
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
        )}

        <label className="text-xs font-medium text-muted-foreground">
          Next action
          <input name="nextAction" defaultValue={value.nextAction ?? ''} placeholder="Call client, finish pricing…" maxLength={500} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground" />
        </label>

        <label className="text-xs font-medium text-muted-foreground">
          Due
          <input name="nextActionDueAt" type="datetime-local" defaultValue={localDateTime(value.nextActionDueAt)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground" />
        </label>

        <label className="text-xs font-medium text-muted-foreground">
          Last contact
          <input name="lastContactAt" type="datetime-local" defaultValue={localDateTime(value.lastContactAt)} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground" />
        </label>

        <label className="text-xs font-medium text-muted-foreground">
          Follow-up outcome
          <input name="followUpOutcome" defaultValue={value.followUpOutcome ?? ''} placeholder="Interested, awaiting dates…" maxLength={1000} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground" />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" name="contactNow" value="true" className="rounded border-border" />
          Record contact now
        </label>
        <button type="submit" className="rounded-lg bg-primary-strong px-3 py-2 text-xs font-medium text-white hover:bg-primary-strong-hover">
          Save workflow
        </button>
      </div>
    </form>
  )
}


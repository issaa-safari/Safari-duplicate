'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addCommunicationLog } from './communication-actions'

const LOG_TYPES = [
  { key: 'whatsapp', label: '💬 WhatsApp' },
  { key: 'call', label: '📞 Call' },
  { key: 'email', label: '📧 Email' },
  { key: 'meeting', label: '🤝 Meeting' },
  { key: 'note', label: '📝 Note' },
]

export default function CommunicationLog({
  requestId,
  logs,
  noteOnly = false,
}: {
  requestId: string
  logs: any[]
  noteOnly?: boolean
}) {
  const router = useRouter()

  const [summary, setSummary] = useState('')
  const [type, setType] = useState(noteOnly ? 'note' : 'whatsapp')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault()
    if (!summary.trim()) return
    setSaving(true)
    setError('')

    const formData = new FormData()
    formData.set('requestId', requestId)
    formData.set('type', type)
    formData.set('summary', summary)

    try {
      await addCommunicationLog(formData)
      setSummary('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save communication log.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Add new log */}
      <form onSubmit={handleAddLog} className="space-y-3">
        {!noteOnly && (
          <div className="flex gap-2 flex-wrap">
            {LOG_TYPES.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                  type === t.key
                    ? 'bg-[var(--olive)] text-white border-primary-strong'
                    : 'bg-surface text-muted-foreground border-border hover:border-border'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          rows={2}
          placeholder="Log a note, call summary, or WhatsApp message..."
          className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-[var(--olive)]"
        />
        <button
          type="submit"
          disabled={saving || !summary.trim()}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 bg-olive hover:bg-olive-dk"
        >
          {saving ? 'Saving...' : 'Add Log Entry'}
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      {/* Log history */}
      <div className="space-y-3 mt-4">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No communication logged yet. Add your first entry above.
          </p>
        ) : (
          logs.map(log => (
            <div key={log.id} className="flex gap-3 text-sm">
              <div className="shrink-0 mt-0.5">
                {log.type === 'whatsapp' && '💬'}
                {log.type === 'call' && '📞'}
                {log.type === 'email' && '📧'}
                {log.type === 'meeting' && '🤝'}
                {log.type === 'note' && '📝'}
              </div>
              <div className="flex-1">
                <p className="text-foreground">{log.summary}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(log.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

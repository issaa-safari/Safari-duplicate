'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
}: {
  requestId: string
  logs: any[]
}) {
  const router = useRouter()
  const supabase = createClient()

  const [summary, setSummary] = useState('')
  const [type, setType] = useState('whatsapp')
  const [saving, setSaving] = useState(false)

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault()
    if (!summary.trim()) return
    setSaving(true)

    await supabase
      .from('communication_logs')
      .insert({
        request_id: requestId,
        type,
        summary: summary.trim(),
      })

    setSummary('')
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Add new log */}
      <form onSubmit={handleAddLog} className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {LOG_TYPES.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                type === t.key
                  ? 'bg-[#7A9A4A] text-white border-[#7A9A4A]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          rows={2}
          placeholder="Log a note, call summary, or WhatsApp message..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]"
        />
        <button
          type="submit"
          disabled={saving || !summary.trim()}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#7A9A4A' }}
        >
          {saving ? 'Saving...' : 'Add Log Entry'}
        </button>
      </form>

      {/* Log history */}
      <div className="space-y-3 mt-4">
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
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
                <p className="text-gray-700">{log.summary}</p>
                <p className="text-xs text-gray-400 mt-0.5">
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

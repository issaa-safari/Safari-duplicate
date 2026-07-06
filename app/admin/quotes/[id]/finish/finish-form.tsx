'use client'

import { useState, useTransition } from 'react'
import { sendQuote, sendTestEmail } from './finish-actions'

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

interface Sender { email: string; label: string }

export default function FinishForm({
  quoteId, versionId, recipientDefault, senders, defaultSubject,
}: {
  quoteId: string
  versionId: string
  recipientDefault: string
  senders: Sender[]
  defaultSubject: string
}) {
  const [channel, setChannel] = useState<'app' | 'download'>('app')
  const [error, setError] = useState('')
  const [testResult, setTestResult] = useState('')
  const [pending, startTransition] = useTransition()

  function fields() {
    const fd = new FormData()
    fd.set('quoteId', quoteId)
    fd.set('versionId', versionId)
    return fd
  }

  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    if (channel === 'download') {
      window.open(`/quote/${quoteId}/print`, '_blank')
      return
    }
    const fd = new FormData(e.currentTarget)
    fd.set('quoteId', quoteId)
    fd.set('versionId', versionId)
    startTransition(async () => {
      try {
        await sendQuote(fd) // redirects on success
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send.')
      }
    })
  }

  function handleTest(form: HTMLFormElement) {
    setTestResult(''); setError('')
    const fd = new FormData(form)
    fd.set('quoteId', quoteId)
    fd.set('versionId', versionId)
    startTransition(async () => {
      const r = await sendTestEmail(fd)
      setTestResult(r.ok ? 'Test email sent to the sender address.' : (r.reason ?? 'Test failed.'))
    })
  }

  return (
    <form onSubmit={handleSend} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>From (sender)</label>
          <select name="senderEmail" className={inputCls} defaultValue={senders[0]?.email ?? ''}>
            {senders.map(s => <option key={s.email} value={s.email}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>To (client)</label>
          <input name="recipientEmail" type="email" required defaultValue={recipientDefault} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Subject</label>
        <input name="subject" defaultValue={defaultSubject} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Message</label>
        <textarea name="message" rows={4} className={inputCls}
          defaultValue={"Dear guest,\n\nPlease find your personalised safari proposal at the link below. I'm happy to adjust anything.\n\nWarm regards,"} />
      </div>
      <div>
        <label className={labelCls}>Signature</label>
        <input name="signature" className={inputCls} placeholder="Your name · Safari Adventure Riders" />
      </div>

      <div>
        <label className={labelCls}>Delivery</label>
        <div className="flex gap-2">
          {(['app', 'download'] as const).map(c => (
            <button key={c} type="button" onClick={() => setChannel(c)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium border transition ${
                channel === c ? 'bg-[var(--olive)]/10 border-[var(--olive)]/40 text-[var(--olive-dk)]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {c === 'app' ? 'Send share link (email)' : 'Download PDF'}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">{error}</p>}
      {testResult && <p className="text-sm text-gray-600 bg-gray-50 rounded-md px-4 py-3">{testResult}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending}
          className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60 bg-olive hover:bg-olive-dk">
          {pending ? 'Working…' : channel === 'app' ? 'Send to client' : 'Open PDF'}
        </button>
        {channel === 'app' && (
          <button type="button" disabled={pending}
            onClick={(e) => handleTest(e.currentTarget.form!)}
            className="rounded-md border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Send test to me
          </button>
        )}
      </div>
    </form>
  )
}

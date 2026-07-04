'use client'

import { useState } from 'react'

const G = '#7A9A4A'

export interface CreatedClient {
  id: string
  first_name: string
  last_name: string
  email: string | null
}

// Small dialog to add a CRM client inline from any client dropdown, so the
// admin doesn't have to leave the flow when the client isn't in the list yet.
export default function CreateClientDialog({
  onCreated,
  onClose,
}: {
  onCreated: (client: CreatedClient, existing: boolean) => void
  onClose: () => void
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [country, setCountry] = useState('')
  const [language, setLanguage] = useState<'en' | 'ar'>('en')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!firstName.trim()) { setError('First name is required.'); return }
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/admin/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, phone, whatsapp, country, language }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create client')
      onCreated(json.item as CreatedClient, !!json.existing)
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create client')
      setBusy(false)
    }
  }

  const inp = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]'
  const lbl = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: 'rgba(26,46,19,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">New Client</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>First name *</label>
            <input autoFocus value={firstName} onChange={e => setFirstName(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Last name</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)} className={inp} />
          </div>
          <div className="col-span-2">
            <label className={lbl}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp}
              placeholder="client@email.com" />
          </div>
          <div>
            <label className={lbl}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>WhatsApp</label>
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Country</label>
            <input value={country} onChange={e => setCountry(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value as 'en' | 'ar')} className={inp}>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          {error && <p className="col-span-2 text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-white">Cancel</button>
          <button onClick={submit} disabled={busy}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: G }}>
            {busy ? 'Creating…' : 'Create Client'}
          </button>
        </div>
      </div>
    </div>
  )
}

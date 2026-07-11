'use client'

import { useState } from 'react'
import Dialog from '@/components/ui/dialog'
import { Field, SelectField } from '@/components/ui/input'

export interface CreatedClient {
  id: string
  first_name: string
  last_name: string
  email: string | null
}

const LBL = 'block text-xs font-medium text-muted-foreground mb-1'

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

  return (
    <Dialog
      title="New Client"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface">Cancel</button>
          <button onClick={submit} disabled={busy}
            className="rounded-md bg-olive px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {busy ? 'Creating…' : 'Create Client'}
          </button>
        </>
      }
    >
      <div className="p-5 grid grid-cols-2 gap-3">
        <Field label="First name *" labelClass={LBL} autoFocus value={firstName}
          onChange={e => setFirstName(e.target.value)} />
        <Field label="Last name" labelClass={LBL} value={lastName}
          onChange={e => setLastName(e.target.value)} />
        <div className="col-span-2">
          <Field label="Email" labelClass={LBL} type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="client@email.com" />
        </div>
        <Field label="Phone" labelClass={LBL} value={phone}
          onChange={e => setPhone(e.target.value)} />
        <Field label="WhatsApp" labelClass={LBL} value={whatsapp}
          onChange={e => setWhatsapp(e.target.value)} />
        <Field label="Country" labelClass={LBL} value={country}
          onChange={e => setCountry(e.target.value)} />
        <SelectField label="Language" labelClass={LBL} value={language}
          onChange={e => setLanguage(e.target.value as 'en' | 'ar')}>
          <option value="en">English</option>
          <option value="ar">Arabic</option>
        </SelectField>
        {error && <p className="col-span-2 text-xs text-destructive">{error}</p>}
      </div>
    </Dialog>
  )
}

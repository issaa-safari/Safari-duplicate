'use client'

import { useState } from 'react'
import { saveSettings } from './actions'

interface Settings {
  company_name: string
  contact_email: string | null
  phone: string | null
  whatsapp: string | null
  default_deposit_pct: number
  usd_to_kes_rate: number
  updated_at: string
}

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]'

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSaved(false)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      await saveSettings(formData)
      setSaved(true)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Company Information</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
          <input type="text" name="companyName" required defaultValue={settings.company_name} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
            <input type="email" name="contactEmail" defaultValue={settings.contact_email ?? ''} placeholder="info@example.com" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" name="phone" defaultValue={settings.phone ?? ''} placeholder="+254…" className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
          <input type="tel" name="whatsapp" defaultValue={settings.whatsapp ?? ''} placeholder="+254…" className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">Used for the WhatsApp chat button on the website.</p>
        </div>
      </div>

      {/* Booking Defaults */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Booking Defaults</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Deposit %</label>
            <input
              type="number"
              name="defaultDepositPct"
              min={1}
              max={100}
              defaultValue={settings.default_deposit_pct}
              required
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">Applied to new tours unless overridden.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">USD → KES Rate</label>
            <input
              type="number"
              name="usdToKesRate"
              min={1}
              step="0.01"
              defaultValue={Number(settings.usd_to_kes_rate)}
              required
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">Used to display KES prices on quotes.</p>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">{error}</p>}
      {saved && <p className="text-sm text-green-700 bg-green-50 rounded-md px-4 py-3">Settings saved.</p>}

      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: '#7A9A4A' }}>
          {loading ? 'Saving…' : 'Save Settings'}
        </button>
        {settings.updated_at && (
          <p className="text-xs text-gray-400">
            Last saved {new Date(settings.updated_at).toLocaleString('en-GB')}
          </p>
        )}
      </div>
    </form>
  )
}

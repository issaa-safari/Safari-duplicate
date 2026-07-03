'use client'

import { useState } from 'react'
import { saveSettings } from './actions'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

interface Settings {
  id: string
  company_name: string
  brand_name: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  website: string | null
  address: string | null
  country: string | null
  currency_primary: string | null
  currency_secondary: string | null
  bank_account_name: string | null
  bank_account_number: string | null
  bank_name: string | null
  bank_account_type: string | null
  deposit_percent: number
  balance_due_days: number
  cancellation_61_plus: string | null
  cancellation_42_60: string | null
  cancellation_28_41: string | null
  cancellation_0_27: string | null
  invoice_prefix: string | null
  quote_prefix: string | null
  booking_prefix: string | null
  default_markup_percent: number
  usd_to_kes_rate?: number | null
  logo_url: string | null
  updated_at: string
}

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--olive)]'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

function Field({ label, name, value, type = 'text', ...props }: {
  label: string; name: string; value: string | number | null; type?: string; [key: string]: unknown
}) {
  return <div><label className={labelCls}>{label}</label><input type={type} name={name} defaultValue={value ?? ''} className={inputCls} {...props} /></div>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"><h2 className="text-sm font-semibold text-gray-900">{title}</h2>{children}</section>
}

export default function SettingsForm({ settings }: { settings: Settings }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await saveSettings(new FormData(event.currentTarget))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="id" value={settings.id} />

      <Section title="Company Info">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Company Name" name="companyName" value={settings.company_name} required />
          <Field label="Brand Name" name="brandName" value={settings.brand_name} />
          <Field label="Country" name="country" value={settings.country} />
          <Field label="Website" name="website" value={settings.website} type="url" placeholder="https://example.com" />
          <Field label="Primary Currency" name="currencyPrimary" value={settings.currency_primary} placeholder="USD" />
          <Field label="Secondary Currency" name="currencySecondary" value={settings.currency_secondary} placeholder="KES" />
        </div>
        <Field label="Logo URL" name="logoUrl" value={settings.logo_url} type="url" />
        <div><label className={labelCls}>Address</label><textarea name="address" defaultValue={settings.address ?? ''} rows={3} className={inputCls} /></div>
      </Section>

      <Section title="Contact">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Email" name="email" value={settings.email} type="email" />
          <Field label="Phone" name="phone" value={settings.phone} type="tel" />
          <Field label="WhatsApp" name="whatsapp" value={settings.whatsapp} type="tel" />
        </div>
      </Section>

      <Section title="Banking">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Bank Name" name="bankName" value={settings.bank_name} />
          <Field label="Account Name" name="bankAccountName" value={settings.bank_account_name} />
          <Field label="Account Number" name="bankAccountNumber" value={settings.bank_account_number} />
          <Field label="Account Type" name="bankAccountType" value={settings.bank_account_type} />
        </div>
      </Section>

      <Section title="Booking & Cancellation Policy">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Field label="Deposit %" name="depositPercent" value={settings.deposit_percent} type="number" min={0} max={100} step="0.01" required />
          <Field label="Balance Due (days)" name="balanceDueDays" value={settings.balance_due_days} type="number" min={0} step={1} required />
          <Field label="Default Markup %" name="defaultMarkupPercent" value={settings.default_markup_percent} type="number" min={0} step="0.01" required />
          <Field label="USD → KES rate" name="usdToKesRate" value={settings.usd_to_kes_rate ?? 129} type="number" min={1} step="0.0001" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Cancellation: 61+ days" name="cancellation61Plus" value={settings.cancellation_61_plus} />
          <Field label="Cancellation: 42–60 days" name="cancellation4260" value={settings.cancellation_42_60} />
          <Field label="Cancellation: 28–41 days" name="cancellation2841" value={settings.cancellation_28_41} />
          <Field label="Cancellation: 0–27 days" name="cancellation027" value={settings.cancellation_0_27} />
        </div>
      </Section>

      <Section title="Document Prefixes">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Invoice Prefix" name="invoicePrefix" value={settings.invoice_prefix} />
          <Field label="Quote Prefix" name="quotePrefix" value={settings.quote_prefix} />
          <Field label="Booking Prefix" name="bookingPrefix" value={settings.booking_prefix} />
        </div>
      </Section>

      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex items-center justify-between">
        <Button type="submit" loading={loading} loadingText="Saving…">Save Settings</Button>
        {settings.updated_at && <p className="text-xs text-gray-400">Last saved {new Date(settings.updated_at).toLocaleString('en-GB')}</p>}
      </div>
    </form>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAction } from '@/lib/hooks/use-action'
import { Alert } from '@/components/ui/alert'
import type { Service } from '@/lib/types'

/** Shared by the new and edit screens — the fields are identical. */
export default function ServiceForm({
  service,
  action,
  retireAction,
  submitLabel,
}: {
  service?: Service
  action: (formData: FormData) => Promise<void>
  retireAction?: (formData: FormData) => Promise<void>
  submitLabel: string
}) {
  const { pending, run } = useAction()
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    run(async () => {
      try {
        await action(fd)
      } catch (err) {
        // A redirect on success surfaces here as a thrown control-flow signal;
        // only real failures carry a message worth showing.
        const message = err instanceof Error ? err.message : 'Something went wrong.'
        if (!message.includes('NEXT_REDIRECT')) setError(message)
      }
    })
  }

  const field = 'w-full rounded border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring/50'
  const label = 'block text-xs font-medium text-muted-foreground mb-1'

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {service && <input type="hidden" name="id" value={service.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nameEn" className={label}>Name (English) *</label>
          <input id="nameEn" name="nameEn" required defaultValue={service?.name_en ?? ''}
            placeholder="Visa application" className={field} />
        </div>
        <div>
          <label htmlFor="nameAr" className={label}>Name (Arabic)</label>
          <input id="nameAr" name="nameAr" dir="auto" defaultValue={service?.name_ar ?? ''}
            placeholder="استخراج التأشيرة" className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="descriptionEn" className={label}>Description (English)</label>
        <textarea id="descriptionEn" name="descriptionEn" rows={2}
          defaultValue={service?.description_en ?? ''} className={field} />
      </div>

      <div>
        <label htmlFor="descriptionAr" className={label}>Description (Arabic)</label>
        <textarea id="descriptionAr" name="descriptionAr" rows={2} dir="auto"
          defaultValue={service?.description_ar ?? ''} className={field} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="defaultPriceUsd" className={label}>Price (USD)</label>
          <input id="defaultPriceUsd" name="defaultPriceUsd" type="number" step="0.01" min="0"
            defaultValue={service ? Number(service.default_price_usd).toFixed(2) : '0.00'} className={field} />
        </div>
        <div>
          <label htmlFor="pricingUnit" className={label}>Charged</label>
          <select id="pricingUnit" name="pricingUnit" defaultValue={service?.pricing_unit ?? 'person'} className={field}>
            <option value="person">Per person</option>
            <option value="booking">Per booking</option>
          </select>
        </div>
        <div>
          <label htmlFor="sortOrder" className={label}>Sort order</label>
          <input id="sortOrder" name="sortOrder" type="number" step="1"
            defaultValue={service?.sort_order ?? 0} className={field} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="isActive" value="true" defaultChecked={service?.is_active ?? true} />
        Active — available to add to a trip
      </label>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending}
          className="rounded bg-olive px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pending ? 'Saving…' : submitLabel}
        </button>
        <Link href="/admin/content/services" className="text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </Link>

        {service && retireAction && service.is_active && (
          <form action={retireAction} className="ms-auto">
            <input type="hidden" name="id" value={service.id} />
            <button type="submit" className="text-sm text-destructive hover:underline">
              Retire
            </button>
          </form>
        )}
      </div>

      {service && (
        <p className="text-xs text-muted-foreground">
          Services are retired, not deleted: a trip that already bought one keeps its record, and the price it
          was sold at.
        </p>
      )}
    </form>
  )
}

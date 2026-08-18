'use client'

import { useState } from 'react'
import PaymentForm from '../../payment-form'

/**
 * "+ Record payment" toggle for a freehand invoice. Trip-based invoices don't
 * get this — recording money against those stays the Receipts page's job —
 * but a freehand invoice has no trip screen at all, so without this there
 * would be no way to record a payment against it anywhere in the app.
 */
export default function RecordPaymentToggle({
  invoiceId,
  label,
  totalSelling,
  alreadyReceived,
}: {
  invoiceId: string
  label: string
  totalSelling: number
  alreadyReceived: number
}) {
  const [paying, setPaying] = useState(false)

  if (paying) {
    return (
      <div className="mt-4 max-w-md">
        <PaymentForm
          invoiceId={invoiceId}
          label={label}
          totalSelling={totalSelling}
          alreadyReceived={alreadyReceived}
          onDone={() => { setPaying(false); window.location.reload() }}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setPaying(true)}
      className="mt-4 text-sm font-medium text-olive hover:underline"
    >
      + Record payment
    </button>
  )
}

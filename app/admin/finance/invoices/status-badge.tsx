import { INVOICE_STATUS_LABEL } from '@/lib/invoice'
import type { InvoiceDisplayStatus } from '@/lib/types'

const TONE: Record<InvoiceDisplayStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  issued: 'bg-blue-100 text-blue-700',
  'part-paid': 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-muted text-muted-foreground line-through',
}

export default function InvoiceStatusBadge({ status }: { status: InvoiceDisplayStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TONE[status]}`}>
      {INVOICE_STATUS_LABEL[status]}
    </span>
  )
}

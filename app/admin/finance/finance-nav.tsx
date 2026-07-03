import Link from 'next/link'

const TABS = [
  { href: '/admin/finance/receipts', label: 'Receipts' },
  { href: '/admin/finance/payables', label: 'Payables' },
  { href: '/admin/finance/expenses', label: 'Expenses' },
  { href: '/admin/finance/pnl', label: 'P&L' },
]

export default function FinanceNav({ active }: { active: string }) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
      {TABS.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === tab.href
              ? 'border-[var(--olive)] text-[var(--olive)]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}

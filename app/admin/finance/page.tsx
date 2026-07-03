import { redirect } from 'next/navigation'

// /admin/finance is now a hub of sub-pages: receipts / payables / expenses / pnl.
export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  redirect(tab === 'pnl' ? '/admin/finance/pnl' : '/admin/finance/receipts')
}

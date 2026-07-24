import { redirect } from 'next/navigation'

// Hotel vouchers now live in their own top-level module. This nested route is
// kept only so existing links and bookmarks land on the departure-scoped view.
export default async function DepartureVouchersRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/admin/vouchers?departure=${id}`)
}

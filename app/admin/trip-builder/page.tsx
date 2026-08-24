import { redirect } from 'next/navigation'

// Proposal building now has one owner: the unified quote workspace. Keep this
// legacy entry point as a redirect so bookmarks do not reopen a second sales
// workflow.
export default function TripBuilderPage() {
  redirect('/admin/quotes/new')
}

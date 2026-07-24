import { redirect } from 'next/navigation'

// The activity log is now the Activity tab of the Insights module. Kept as a
// redirect so existing links and bookmarks still resolve.
export default function ActivityRedirect() {
  redirect('/admin/insights/activity')
}

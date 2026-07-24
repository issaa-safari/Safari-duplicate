import { redirect } from 'next/navigation'

// Analytics is now the default tab of the Insights module. Kept as a redirect
// so existing links and bookmarks still resolve.
export default function AnalyticsRedirect() {
  redirect('/admin/insights')
}

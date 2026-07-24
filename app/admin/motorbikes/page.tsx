import { redirect } from 'next/navigation'

// Motorbikes moved into the Content library, alongside Vehicles. This route is
// kept so existing links and bookmarks still resolve.
export default function MotorbikesRedirect() {
  redirect('/admin/content/motorbikes')
}

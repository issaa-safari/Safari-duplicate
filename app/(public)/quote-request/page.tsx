import { createAdminClient } from '@/lib/supabase/admin'
import QuoteRequestForm from '@/components/public/quote-request-form'

export const dynamic = 'force-dynamic'

export default async function QuoteRequestPage() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('tours')
    .select('id, title_en, title_ar')
    .eq('status', 'active')
    .eq('show_on_website', true)
    .order('title_en')

  return <QuoteRequestForm initialTours={data ?? []} />
}

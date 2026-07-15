import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SecurityForm from './form'
import TwoFactor from './two-factor'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'

export default async function SecurityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-8">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <SecurityForm user={user} />
            <TwoFactor />
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  )
}

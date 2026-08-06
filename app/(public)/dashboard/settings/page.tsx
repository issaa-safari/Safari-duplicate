import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SettingsForm from './form'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import { getServerLocale } from '@/lib/i18n'
import { localePath } from '@/lib/locale'

export default async function SettingsPage() {
  const locale = await getServerLocale()
  const isAr = locale === 'ar'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(localePath('/login', locale))

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-8">
            <Link href={localePath('/dashboard', locale)} className="text-sm text-gray-600 hover:text-gray-900 mb-4 inline-block">
              {isAr ? '→' : '←'} {isAr ? 'العودة إلى لوحة التحكم' : 'Back to Dashboard'}
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{isAr ? 'إعدادات الحساب' : 'Account Settings'}</h1>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <SettingsForm user={user} />
          </div>
        </div>
      </main>
      <PublicFooter />
    </>
  )
}

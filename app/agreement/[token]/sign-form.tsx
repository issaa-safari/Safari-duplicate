'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignForm({ token, defaultName, ar }: { token: string; defaultName: string; ar?: boolean }) {
  const router = useRouter()
  const [name, setName] = useState(defaultName)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const L = ar
    ? {
        label: 'اكتب اسمك الكامل للتوقيع', placeholder: 'الاسم الكامل',
        consent: 'لقد قرأت وأوافق على جميع الشروط والسياسات وإخلاء المسؤولية المذكورة أعلاه.',
        needName: 'يرجى كتابة اسمك الكامل.', needAgree: 'يرجى تحديد المربع للتأكيد على موافقتك.',
        submit: 'الموافقة والتوقيع', submitting: 'جارٍ الإرسال…',
        generic: 'تعذّر الإرسال. حاول مرة أخرى.', network: 'خطأ في الشبكة. حاول مرة أخرى.',
        note: 'يسجّل التوقيع اسمك وتاريخ التوقيع وتفاصيل جهازك كتوقيع إلكتروني.',
      }
    : {
        label: 'Type your full name to sign', placeholder: 'Full legal name',
        consent: 'I have read and agree to all terms, policies and the release of liability set out above.',
        needName: 'Please type your full name.', needAgree: 'Please tick the box to confirm you agree.',
        submit: 'Agree & sign', submitting: 'Submitting…',
        generic: 'Could not submit. Please try again.', network: 'Network error. Please try again.',
        note: 'Signing records your name, the date, and your device details as an electronic signature.',
      }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError(L.needName); return }
    if (!agreed) { setError(L.needAgree); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/agreement/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signedName: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? L.generic); setSubmitting(false); return }
      router.refresh()
    } catch {
      setError(L.network)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <label className="block text-sm font-medium text-gray-700 mb-1">{L.label}</label>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={L.placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
      />
      <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5" />
        <span>{L.consent}</span>
      </label>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
      >
        {submitting ? L.submitting : L.submit}
      </button>
      <p className="mt-3 text-center text-xs text-gray-400">{L.note}</p>
    </form>
  )
}

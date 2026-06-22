'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TourEditForm({ tour }: { tour: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [titleEn, setTitleEn] = useState(tour.title_en ?? '')
  const [titleAr, setTitleAr] = useState(tour.title_ar ?? '')
  const [subtitleEn, setSubtitleEn] = useState(tour.subtitle_en ?? '')
  const [overviewEn, setOverviewEn] = useState(tour.overview_en ?? '')
  const [status, setStatus] = useState(tour.status ?? 'draft')
  const [featured, setFeatured] = useState(tour.featured ?? false)
  const [showOnWebsite, setShowOnWebsite] = useState(tour.show_on_website ?? true)
  const [maxGroupSize, setMaxGroupSize] = useState(tour.max_group_size ?? 12)
  const [basePrice, setBasePrice] = useState(tour.base_price_usd ?? '')
  const [depositPercent, setDepositPercent] = useState(tour.deposit_percent ?? 30)
  const [difficultyRating, setDifficultyRating] = useState(tour.difficulty_rating ?? 5)
  const [comfortRating, setComfortRating] = useState(tour.comfort_rating ?? 5)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(false)

    try {
      const res = await fetch('/api/admin/update-tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tour.id,
          title_en: titleEn,
          title_ar: titleAr,
          subtitle_en: subtitleEn,
          overview_en: overviewEn,
          status,
          featured,
          show_on_website: showOnWebsite,
          max_group_size: maxGroupSize,
          base_price_usd: basePrice || null,
          deposit_percent: depositPercent,
          difficulty_rating: difficultyRating,
          comfort_rating: comfortRating,
        }),
      })

      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Tour Details</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title (English)</label>
          <input type="text" value={titleEn} onChange={e => setTitleEn(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title (Arabic)</label>
          <input type="text" value={titleAr} onChange={e => setTitleAr(e.target.value)}
            dir="rtl"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle (English)</label>
          <input type="text" value={subtitleEn} onChange={e => setSubtitleEn(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Overview (English)</label>
          <textarea value={overviewEn} onChange={e => setOverviewEn(e.target.value)} rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (USD)</label>
            <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)}
              placeholder="e.g. 1350"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Group Size</label>
            <input type="number" value={maxGroupSize} onChange={e => setMaxGroupSize(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deposit %</label>
            <input type="number" value={depositPercent} onChange={e => setDepositPercent(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#7A9A4A]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty Rating ({difficultyRating}/10)
            </label>
            <input type="range" min={1} max={10} value={difficultyRating}
              onChange={e => setDifficultyRating(Number(e.target.value))}
              className="w-full accent-[#7A9A4A]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comfort Rating ({comfortRating}/10)
            </label>
            <input type="range" min={1} max={10} value={comfortRating}
              onChange={e => setComfortRating(Number(e.target.value))}
              className="w-full accent-[#7A9A4A]" />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)}
              className="rounded border-gray-300" />
            Featured on homepage
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={showOnWebsite} onChange={e => setShowOnWebsite(e.target.checked)}
              className="rounded border-gray-300" />
            Show on website
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-4 py-3">{error}</p>}
      {saved && <p className="text-sm text-green-600 bg-green-50 rounded-md px-4 py-3">Saved successfully.</p>}

      <button type="submit" disabled={loading}
        className="rounded-md px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: '#7A9A4A' }}>
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
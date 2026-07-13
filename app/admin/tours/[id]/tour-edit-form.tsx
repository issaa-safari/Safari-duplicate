'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUpload, GalleryUpload } from '@/components/admin/image-upload'

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

const linesToArr = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean)
const arrToLines = (a: any) => (Array.isArray(a) ? a.join('\n') : '')

interface Faq { q_en: string; a_en: string; q_ar: string; a_ar: string }

export default function TourEditForm({ tour }: { tour: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Core
  const [titleEn, setTitleEn] = useState(tour.title_en ?? '')
  const [titleAr, setTitleAr] = useState(tour.title_ar ?? '')
  const [subtitleEn, setSubtitleEn] = useState(tour.subtitle_en ?? '')
  const [subtitleAr, setSubtitleAr] = useState(tour.subtitle_ar ?? '')
  const [overviewEn, setOverviewEn] = useState(tour.overview_en ?? '')
  const [overviewAr, setOverviewAr] = useState(tour.overview_ar ?? '')
  const [countriesVisited, setCountriesVisited] = useState(tour.countries_visited ?? '')
  const [startDestination, setStartDestination] = useState(tour.start_destination ?? '')
  const [endDestination, setEndDestination] = useState(tour.end_destination ?? '')
  const [status, setStatus] = useState(tour.status ?? 'draft')
  const [featured, setFeatured] = useState(tour.featured ?? false)
  const [showOnWebsite, setShowOnWebsite] = useState(tour.show_on_website ?? true)
  const [maxGroupSize, setMaxGroupSize] = useState(tour.max_group_size ?? 12)
  const [basePrice, setBasePrice] = useState(tour.base_price_usd ?? '')
  const [depositPercent, setDepositPercent] = useState(tour.deposit_percent ?? 30)
  const [difficultyRating, setDifficultyRating] = useState(tour.difficulty_rating ?? 5)
  const [comfortRating, setComfortRating] = useState(tour.comfort_rating ?? 5)

  // At-a-glance
  const [terrain, setTerrain] = useState(tour.terrain ?? '')
  const [vehicle, setVehicle] = useState(tour.vehicle ?? '')
  const [accommodationLevel, setAccommodationLevel] = useState(tour.accommodation_level ?? '')
  const [totalDistanceKm, setTotalDistanceKm] = useState(tour.total_distance_km ?? '')

  // Media
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(tour.hero_image_url ?? null)
  const [routeMapUrl, setRouteMapUrl] = useState<string | null>(tour.route_map_url ?? null)
  const [galleryUrls, setGalleryUrls] = useState<string[]>(Array.isArray(tour.gallery_urls) ? tour.gallery_urls : [])

  // Lists (edited as one-per-line text)
  const [highlightsEn, setHighlightsEn] = useState(arrToLines(tour.highlights_en))
  const [highlightsAr, setHighlightsAr] = useState(arrToLines(tour.highlights_ar))
  const [includedEn, setIncludedEn] = useState(arrToLines(tour.included_en))
  const [includedAr, setIncludedAr] = useState(arrToLines(tour.included_ar))
  const [excludedEn, setExcludedEn] = useState(arrToLines(tour.excluded_en))
  const [excludedAr, setExcludedAr] = useState(arrToLines(tour.excluded_ar))

  // FAQs
  const [faqs, setFaqs] = useState<Faq[]>(Array.isArray(tour.faqs) ? tour.faqs : [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/admin/update-tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tour.id,
          title_en: titleEn, title_ar: titleAr,
          subtitle_en: subtitleEn, subtitle_ar: subtitleAr,
          overview_en: overviewEn, overview_ar: overviewAr,
          countries_visited: countriesVisited || null,
          start_destination: startDestination || null,
          end_destination: endDestination || null,
          status, featured, show_on_website: showOnWebsite,
          max_group_size: maxGroupSize,
          base_price_usd: basePrice || null,
          deposit_percent: depositPercent,
          difficulty_rating: difficultyRating, comfort_rating: comfortRating,
          terrain: terrain || null, vehicle: vehicle || null,
          accommodation_level: accommodationLevel || null,
          total_distance_km: totalDistanceKm === '' ? null : Number(totalDistanceKm),
          hero_image_url: heroImageUrl, route_map_url: routeMapUrl,
          gallery_urls: galleryUrls,
          highlights_en: linesToArr(highlightsEn), highlights_ar: linesToArr(highlightsAr),
          included_en: linesToArr(includedEn), included_ar: linesToArr(includedAr),
          excluded_en: linesToArr(excludedEn), excluded_ar: linesToArr(excludedAr),
          faqs: faqs.filter(f => f.q_en || f.q_ar),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      setSaved(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border border-border bg-surface shadow-sm p-5 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  )
  const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground mb-1">{children}</label>
  )

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-3xl">
      <Section title="Basic Details">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label htmlFor="tf-titleEn">Title (English)</Label><input id="tf-titleEn" value={titleEn} onChange={e => setTitleEn(e.target.value)} className={inputCls} /></div>
          <div><Label htmlFor="tf-titleAr">Title (Arabic)</Label><input id="tf-titleAr" value={titleAr} onChange={e => setTitleAr(e.target.value)} dir="rtl" className={inputCls} /></div>
          <div><Label htmlFor="tf-subtitleEn">Subtitle (English)</Label><input id="tf-subtitleEn" value={subtitleEn} onChange={e => setSubtitleEn(e.target.value)} className={inputCls} /></div>
          <div><Label htmlFor="tf-subtitleAr">Subtitle (Arabic)</Label><input id="tf-subtitleAr" value={subtitleAr} onChange={e => setSubtitleAr(e.target.value)} dir="rtl" className={inputCls} /></div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label htmlFor="tf-countriesVisited">Countries Visited</Label><input id="tf-countriesVisited" value={countriesVisited} onChange={e => setCountriesVisited(e.target.value)} placeholder="Kenya, Tanzania" className={inputCls} /></div>
          <div><Label htmlFor="tf-startDestination">Start Destination</Label><input id="tf-startDestination" value={startDestination} onChange={e => setStartDestination(e.target.value)} placeholder="Nairobi" className={inputCls} /></div>
          <div><Label htmlFor="tf-endDestination">End Destination</Label><input id="tf-endDestination" value={endDestination} onChange={e => setEndDestination(e.target.value)} placeholder="Nairobi" className={inputCls} /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label htmlFor="tf-overviewEn">Overview (English)</Label><textarea id="tf-overviewEn" value={overviewEn} onChange={e => setOverviewEn(e.target.value)} rows={5} className={inputCls} /></div>
          <div><Label htmlFor="tf-overviewAr">Overview (Arabic)</Label><textarea id="tf-overviewAr" value={overviewAr} onChange={e => setOverviewAr(e.target.value)} rows={5} dir="rtl" className={inputCls} /></div>
        </div>
      </Section>

      <Section title="Media">
        <div><Label>Hero Image</Label><ImageUpload value={heroImageUrl} onChange={setHeroImageUrl} folder="tours/hero" label="Upload hero image" /></div>
        <div><Label>Route Map</Label><ImageUpload value={routeMapUrl} onChange={setRouteMapUrl} folder="tours/maps" label="Upload route map" /></div>
        <div><Label>Photo Gallery</Label><GalleryUpload value={galleryUrls} onChange={setGalleryUrls} folder="tours/gallery" /></div>
      </Section>

      <Section title="At a Glance">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label htmlFor="tf-terrain">Terrain</Label><input id="tf-terrain" value={terrain} onChange={e => setTerrain(e.target.value)} placeholder="Tarmac, gravel, savannah trails" className={inputCls} /></div>
          <div><Label htmlFor="tf-vehicle">Vehicle / Bike</Label><input id="tf-vehicle" value={vehicle} onChange={e => setVehicle(e.target.value)} placeholder="4x4 Land Cruiser / adventure bike" className={inputCls} /></div>
          <div><Label htmlFor="tf-accommodationLevel">Accommodation Level</Label><input id="tf-accommodationLevel" value={accommodationLevel} onChange={e => setAccommodationLevel(e.target.value)} placeholder="3–4★ lodges &amp; camps" className={inputCls} /></div>
          <div><Label htmlFor="tf-totalDistanceKm">Total Distance (km)</Label><input id="tf-totalDistanceKm" type="number" value={totalDistanceKm} onChange={e => setTotalDistanceKm(e.target.value)} className={inputCls} /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label htmlFor="tf-difficultyRating">Difficulty ({difficultyRating}/10)</Label><input id="tf-difficultyRating" type="range" min={1} max={10} value={difficultyRating} onChange={e => setDifficultyRating(Number(e.target.value))} className="w-full accent-[var(--olive)]" /></div>
          <div><Label htmlFor="tf-comfortRating">Comfort ({comfortRating}/10)</Label><input id="tf-comfortRating" type="range" min={1} max={10} value={comfortRating} onChange={e => setComfortRating(Number(e.target.value))} className="w-full accent-[var(--olive)]" /></div>
        </div>
      </Section>

      <Section title="Highlights (one per line)">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label htmlFor="tf-highlightsEn">English</Label><textarea id="tf-highlightsEn" value={highlightsEn} onChange={e => setHighlightsEn(e.target.value)} rows={5} placeholder="Big Five game drives&#10;Maasai Mara sundowner" className={inputCls} /></div>
          <div><Label htmlFor="tf-highlightsAr">Arabic</Label><textarea id="tf-highlightsAr" value={highlightsAr} onChange={e => setHighlightsAr(e.target.value)} rows={5} dir="rtl" className={inputCls} /></div>
        </div>
      </Section>

      <Section title="What's Included (one per line)">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label htmlFor="tf-includedEn">English</Label><textarea id="tf-includedEn" value={includedEn} onChange={e => setIncludedEn(e.target.value)} rows={5} className={inputCls} /></div>
          <div><Label htmlFor="tf-includedAr">Arabic</Label><textarea id="tf-includedAr" value={includedAr} onChange={e => setIncludedAr(e.target.value)} rows={5} dir="rtl" className={inputCls} /></div>
        </div>
      </Section>

      <Section title="What's Excluded (one per line)">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label htmlFor="tf-excludedEn">English</Label><textarea id="tf-excludedEn" value={excludedEn} onChange={e => setExcludedEn(e.target.value)} rows={4} className={inputCls} /></div>
          <div><Label htmlFor="tf-excludedAr">Arabic</Label><textarea id="tf-excludedAr" value={excludedAr} onChange={e => setExcludedAr(e.target.value)} rows={4} dir="rtl" className={inputCls} /></div>
        </div>
      </Section>

      <Section title="FAQs">
        <div className="space-y-4">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-md border border-border p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-muted-foreground">FAQ {i + 1}</span>
                <button type="button" onClick={() => setFaqs(faqs.filter((_, idx) => idx !== i))} className="text-xs text-destructive hover:underline">Remove</button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                <input value={f.q_en} onChange={e => setFaqs(faqs.map((x, idx) => idx === i ? { ...x, q_en: e.target.value } : x))} placeholder="Question (EN)" className={inputCls} />
                <input value={f.q_ar} onChange={e => setFaqs(faqs.map((x, idx) => idx === i ? { ...x, q_ar: e.target.value } : x))} placeholder="Question (AR)" dir="rtl" className={inputCls} />
                <textarea value={f.a_en} onChange={e => setFaqs(faqs.map((x, idx) => idx === i ? { ...x, a_en: e.target.value } : x))} placeholder="Answer (EN)" rows={2} className={inputCls} />
                <textarea value={f.a_ar} onChange={e => setFaqs(faqs.map((x, idx) => idx === i ? { ...x, a_ar: e.target.value } : x))} placeholder="Answer (AR)" rows={2} dir="rtl" className={inputCls} />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setFaqs([...faqs, { q_en: '', a_en: '', q_ar: '', a_ar: '' }])}
            className="text-sm font-medium text-brand-text hover:underline">+ Add FAQ</button>
        </div>
      </Section>

      <Section title="Publishing &amp; Pricing">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tf-status">Status</Label>
            <select id="tf-status" value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <Label htmlFor="tf-basePrice">Default / Starting Price (USD)</Label>
            <input id="tf-basePrice" type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} className={inputCls} />
            <p className="text-[11px] text-muted-foreground mt-1">Suggested price — pre-fills new departures. The departure&apos;s own price is what shows on the website.</p>
          </div>
          <div><Label htmlFor="tf-maxGroupSize">Max Group Size</Label><input id="tf-maxGroupSize" type="number" value={maxGroupSize} onChange={e => setMaxGroupSize(Number(e.target.value))} className={inputCls} /></div>
          <div><Label htmlFor="tf-depositPercent">Deposit %</Label><input id="tf-depositPercent" type="number" value={depositPercent} onChange={e => setDepositPercent(Number(e.target.value))} className={inputCls} /></div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} className="rounded border-border" /> Featured on homepage</label>
          <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={showOnWebsite} onChange={e => setShowOnWebsite(e.target.checked)} className="rounded border-border" /> Show on website</label>
        </div>
      </Section>

      {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">{error}</p>}
      {saved && <p className="text-sm text-accent-foreground bg-accent rounded-md px-4 py-3">Saved successfully.</p>}

      <div className="sticky bottom-4">
        <button type="submit" disabled={loading}
          className="rounded-md px-6 py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-60 bg-olive hover:bg-olive-dk">
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

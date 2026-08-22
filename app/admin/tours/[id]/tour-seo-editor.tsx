'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

const inputCls = 'w-full rounded-md border border-border px-3 py-2 text-sm text-foreground bg-surface focus:outline-none focus:ring-2 focus:ring-ring/50'

const SECTION_LABELS: Record<string, { en: string; ar: string }> = {
  why_choose: { en: 'Why Choose This Tour', ar: 'لماذا تختار هذه الرحلة' },
  wildlife: { en: 'Wildlife', ar: 'الحياة البرية' },
  safari_experience: { en: 'Safari Experience', ar: 'تجربة السفاري' },
  game_drives: { en: 'Game Drives', ar: 'جولات السفاري' },
  accommodation_experience: { en: 'Accommodation Experience', ar: 'تجربة الإقامة' },
  best_time: { en: 'Best Time to Travel', ar: 'أفضل وقت للسفر' },
  who_for: { en: 'Who This Tour Is For', ar: 'لمن تناسب هذه الرحلة' },
  luxury_experience: { en: 'Luxury Experience', ar: 'التجربة الفاخرة' },
  private_transfers: { en: 'Private Transfers', ar: 'التنقلات الخاصة' },
  exclusive_experiences: { en: 'Exclusive Experiences', ar: 'التجارب الخاصة' },
  dining: { en: 'Dining', ar: 'تجربة الطعام' },
  personalization: { en: 'Personalization', ar: 'التخصيص' },
  family_suitability: { en: 'Family Suitability', ar: 'ملاءمة الرحلة للعائلات' },
  child_friendly: { en: 'Child-Friendly Experiences', ar: 'تجارب مناسبة للأطفال' },
  travel_times: { en: 'Travel Times', ar: 'أوقات التنقل' },
  family_accommodation: { en: 'Family Accommodation', ar: 'إقامة العائلات' },
  meal_flexibility: { en: 'Meal Flexibility', ar: 'مرونة الوجبات' },
  rest_time: { en: 'Rest / Free Time', ar: 'الراحة والوقت الحر' },
  safety: { en: 'Safety', ar: 'السلامة' },
  riding_experience: { en: 'Riding Experience', ar: 'تجربة القيادة' },
  route_highlights: { en: 'Route Highlights', ar: 'أبرز محطات المسار' },
  terrain: { en: 'Terrain', ar: 'طبيعة الطرق' },
  road_surfaces: { en: 'Road Surfaces', ar: 'أسطح الطرق' },
  rider_experience: { en: 'Required Riding Experience', ar: 'الخبرة المطلوبة للقيادة' },
  support: { en: 'Tour Support', ar: 'دعم الرحلة' },
  riding_gear: { en: 'Riding Gear', ar: 'معدات القيادة' },
  fuel_information: { en: 'Fuel Information', ar: 'معلومات الوقود' },
  photography: { en: 'Photography Opportunities', ar: 'فرص التصوير' },
  landscape_photography: { en: 'Landscape Photography', ar: 'تصوير الطبيعة' },
  lighting: { en: 'Light & Timing', ar: 'الإضاءة والتوقيت' },
  vehicle_setup: { en: 'Vehicle Setup', ar: 'تجهيز المركبة' },
  equipment_advice: { en: 'Equipment Advice', ar: 'نصائح المعدات' },
  photography_guide: { en: 'Photography Guide', ar: 'إرشاد التصوير' },
  kenya_highlights: { en: 'Kenya Highlights', ar: 'أبرز تجارب كينيا' },
  tanzania_highlights: { en: 'Tanzania Highlights', ar: 'أبرز تجارب تنزانيا' },
  border_logistics: { en: 'Border / Flight Logistics', ar: 'ترتيبات الحدود والطيران' },
  entry_requirements: { en: 'Entry Requirements', ar: 'متطلبات الدخول' },
  possible_destinations: { en: 'Possible Destinations', ar: 'الوجهات الممكنة' },
  vehicle_experience: { en: 'Vehicle Options', ar: 'خيارات المركبات' },
  customization: { en: 'Customization Options', ar: 'خيارات التخصيص' },
  duration_flexibility: { en: 'Duration Flexibility', ar: 'مرونة مدة الرحلة' },
  activities: { en: 'Activities', ar: 'الأنشطة' },
  group_experience: { en: 'Group Experience', ar: 'تجربة المجموعة' },
  tour_leader: { en: 'Tour Leader', ar: 'قائد الرحلة' },
  booking_conditions: { en: 'Booking Conditions', ar: 'شروط الحجز' },
}

type Template = {
  id: string
  key: string
  name_en: string
  name_ar: string
  config_json?: { sectionOrder?: string[]; requiredSections?: string[] }
}

type Section = {
  section_key: string
  title_en?: string | null
  title_ar?: string | null
  content_en?: string | null
  content_ar?: string | null
  sort_order?: number
  is_enabled?: boolean
}

const csvToArray = (value: string) => value.split(',').map(x => x.trim()).filter(Boolean)
const arrayToCsv = (value: unknown) => Array.isArray(value) ? value.join(', ') : ''
const filled = (value: unknown) => typeof value === 'string' && value.trim().length > 0

export default function TourSeoEditor({
  tour,
  templates,
  initialSeo,
  initialSections,
  itineraryCount,
}: {
  tour: any
  templates: Template[]
  initialSeo: any
  initialSections: Section[]
  itineraryCount: number
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [templateId, setTemplateId] = useState(tour.template_id ?? '')
  const [seo, setSeo] = useState({
    seo_title_en: initialSeo?.seo_title_en ?? '',
    seo_title_ar: initialSeo?.seo_title_ar ?? '',
    meta_description_en: initialSeo?.meta_description_en ?? '',
    meta_description_ar: initialSeo?.meta_description_ar ?? '',
    primary_keyword_en: initialSeo?.primary_keyword_en ?? '',
    primary_keyword_ar: initialSeo?.primary_keyword_ar ?? '',
    secondary_keywords_en: arrayToCsv(initialSeo?.secondary_keywords_en),
    secondary_keywords_ar: arrayToCsv(initialSeo?.secondary_keywords_ar),
    search_intent: initialSeo?.search_intent ?? 'commercial',
    seo_intro_en: initialSeo?.seo_intro_en ?? '',
    seo_intro_ar: initialSeo?.seo_intro_ar ?? '',
    hero_alt_en: initialSeo?.hero_alt_en ?? '',
    hero_alt_ar: initialSeo?.hero_alt_ar ?? '',
  })

  const selectedTemplate = templates.find(t => t.id === templateId)
  const sectionOrder = selectedTemplate?.config_json?.sectionOrder ?? []
  const requiredSections = selectedTemplate?.config_json?.requiredSections ?? []
  const initialMap = Object.fromEntries(initialSections.map(section => [section.section_key, section]))
  const [sections, setSections] = useState<Record<string, Section>>(initialMap)

  const completeness = useMemo(() => {
    const basicChecks = [tour.title_en, tour.overview_en, tour.hero_image_url, itineraryCount > 0 ? 'yes' : '']
    const content = Math.round((basicChecks.filter(Boolean).length / basicChecks.length) * 100)
    const arChecks = [tour.title_ar, tour.overview_ar, seo.seo_title_ar, seo.meta_description_ar, seo.hero_alt_ar]
    const arabic = Math.round((arChecks.filter(filled).length / arChecks.length) * 100)
    const seoChecks = [seo.seo_title_en, seo.meta_description_en, seo.primary_keyword_en, seo.seo_intro_en, seo.hero_alt_en, templateId]
    const technicalSeo = Math.round((seoChecks.filter(filled).length / seoChecks.length) * 100)
    return { content, arabic, seo: technicalSeo }
  }, [tour, itineraryCount, seo, templateId])

  const warnings = useMemo(() => {
    const list: string[] = []
    if (!filled(seo.seo_title_en)) list.push('English SEO title is missing')
    if (!filled(seo.meta_description_en)) list.push('English meta description is missing')
    if (!filled(seo.seo_title_ar)) list.push('Arabic SEO title is missing')
    if (!filled(seo.meta_description_ar)) list.push('Arabic meta description is missing')
    if (!filled(seo.hero_alt_en)) list.push('Hero image English alt text is missing')
    if (!filled(seo.hero_alt_ar)) list.push('Hero image Arabic alt text is missing')
    if (!templateId) list.push('Tour template is not selected')
    for (const key of requiredSections) {
      if (!filled(sections[key]?.content_en)) list.push(`${SECTION_LABELS[key]?.en ?? key} content is missing`)
    }
    return list
  }, [seo, templateId, requiredSections, sections])

  const updateSeo = (key: string, value: string) => setSeo(current => ({ ...current, [key]: value }))
  const updateSection = (key: string, patch: Partial<Section>) => setSections(current => ({
    ...current,
    [key]: {
      ...current[key],
      ...patch,
      section_key: key,
      is_enabled: patch.is_enabled ?? current[key]?.is_enabled ?? true,
    },
  }))

  async function save() {
    setSaving(true); setSaved(false); setError('')
    try {
      const payloadSections = sectionOrder.map((key, index) => ({
        section_key: key,
        title_en: sections[key]?.title_en || SECTION_LABELS[key]?.en || key,
        title_ar: sections[key]?.title_ar || SECTION_LABELS[key]?.ar || key,
        content_en: sections[key]?.content_en || '',
        content_ar: sections[key]?.content_ar || '',
        is_enabled: sections[key]?.is_enabled !== false,
        sort_order: index,
      }))
      const res = await fetch('/api/admin/update-tour-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tour_id: tour.id,
          template_id: templateId || null,
          seo: {
            ...seo,
            secondary_keywords_en: csvToArray(seo.secondary_keywords_en),
            secondary_keywords_ar: csvToArray(seo.secondary_keywords_ar),
          },
          sections: payloadSections,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to save SEO settings')
      setSaved(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface shadow-sm p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Tour SEO Control</h2>
            <p className="text-xs text-muted-foreground mt-1">Template-driven content and bilingual search metadata.</p>
          </div>
          <button type="button" onClick={save} disabled={saving} className="rounded-md bg-bush px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save SEO'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            ['Content', completeness.content],
            ['Arabic', completeness.arabic],
            ['SEO', completeness.seo],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-xl font-semibold text-foreground mt-1">{value}%</div>
              <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden"><div className="h-full bg-olive" style={{ width: `${value}%` }} /></div>
            </div>
          ))}
        </div>

        <label className="block text-sm font-medium text-foreground mb-1">Tour Template</label>
        <select value={templateId} onChange={e => setTemplateId(e.target.value)} className={inputCls}>
          <option value="">Select template</option>
          {templates.map(template => <option key={template.id} value={template.id}>{template.name_en} — {template.name_ar}</option>)}
        </select>

        {warnings.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs font-semibold text-amber-900 mb-2">Needs attention</div>
            <ul className="space-y-1 text-xs text-amber-800">{warnings.map(item => <li key={item}>• {item}</li>)}</ul>
          </div>
        )}
        {saved && <p className="text-sm text-green-700 mt-3">SEO settings saved.</p>}
        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
      </div>

      <div className="rounded-xl border border-border bg-surface shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Search Metadata</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="text-sm font-medium">SEO Title (English)</label><input value={seo.seo_title_en} onChange={e => updateSeo('seo_title_en', e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium">SEO Title (Arabic)</label><input dir="rtl" value={seo.seo_title_ar} onChange={e => updateSeo('seo_title_ar', e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium">Meta Description (English)</label><textarea rows={3} value={seo.meta_description_en} onChange={e => updateSeo('meta_description_en', e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium">Meta Description (Arabic)</label><textarea rows={3} dir="rtl" value={seo.meta_description_ar} onChange={e => updateSeo('meta_description_ar', e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium">Primary Search Topic (English)</label><input value={seo.primary_keyword_en} onChange={e => updateSeo('primary_keyword_en', e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium">Primary Search Topic (Arabic)</label><input dir="rtl" value={seo.primary_keyword_ar} onChange={e => updateSeo('primary_keyword_ar', e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium">Supporting Topics (comma-separated)</label><input value={seo.secondary_keywords_en} onChange={e => updateSeo('secondary_keywords_en', e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium">مواضيع داعمة</label><input dir="rtl" value={seo.secondary_keywords_ar} onChange={e => updateSeo('secondary_keywords_ar', e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium">Search Intent</label><select value={seo.search_intent} onChange={e => updateSeo('search_intent', e.target.value)} className={inputCls}><option value="commercial">Commercial</option><option value="transactional">Transactional</option><option value="informational">Informational</option><option value="mixed">Mixed</option></select></div>
          <div />
          <div><label className="text-sm font-medium">SEO Intro (English)</label><textarea rows={4} value={seo.seo_intro_en} onChange={e => updateSeo('seo_intro_en', e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium">SEO Intro (Arabic)</label><textarea rows={4} dir="rtl" value={seo.seo_intro_ar} onChange={e => updateSeo('seo_intro_ar', e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium">Hero Image Alt (English)</label><input value={seo.hero_alt_en} onChange={e => updateSeo('hero_alt_en', e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium">Hero Image Alt (Arabic)</label><input dir="rtl" value={seo.hero_alt_ar} onChange={e => updateSeo('hero_alt_ar', e.target.value)} className={inputCls} /></div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-2">
          <div className="rounded-lg border border-border p-4">
            <div className="text-xs text-muted-foreground mb-2">Google Preview — EN</div>
            <div className="text-blue-700 text-lg leading-tight">{seo.seo_title_en || tour.title_en}</div>
            <div className="text-green-700 text-xs mt-1">safariadventureriders.com/tours/{tour.slug}</div>
            <p className="text-sm text-muted-foreground mt-1">{seo.meta_description_en || 'Add a meta description to preview the search snippet.'}</p>
          </div>
          <div className="rounded-lg border border-border p-4" dir="rtl">
            <div className="text-xs text-muted-foreground mb-2">معاينة Google — AR</div>
            <div className="text-blue-700 text-lg leading-tight">{seo.seo_title_ar || tour.title_ar || tour.title_en}</div>
            <div className="text-green-700 text-xs mt-1">safariadventureriders.com/ar/tours/{tour.slug}</div>
            <p className="text-sm text-muted-foreground mt-1">{seo.meta_description_ar || 'أضف وصفاً مخصصاً لنتائج البحث.'}</p>
          </div>
        </div>
      </div>

      {selectedTemplate && sectionOrder.length > 0 && (
        <div className="rounded-xl border border-border bg-surface shadow-sm p-5 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{selectedTemplate.name_en} Content</h2>
            <p className="text-xs text-muted-foreground mt-1">Enter factual, tour-specific content. Blank sections are not published.</p>
          </div>
          {sectionOrder.map((key) => {
            const labels = SECTION_LABELS[key] ?? { en: key, ar: key }
            const section = sections[key] ?? { section_key: key, is_enabled: true }
            const required = requiredSections.includes(key)
            return (
              <div key={key} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div><span className="text-sm font-medium text-foreground">{labels.en}</span>{required && <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700">Recommended</span>}</div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={section.is_enabled !== false} onChange={e => updateSection(key, { is_enabled: e.target.checked })} /> Enabled</label>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <textarea rows={4} value={section.content_en ?? ''} onChange={e => updateSection(key, { content_en: e.target.value })} placeholder={`${labels.en} — factual English content`} className={inputCls} />
                  <textarea rows={4} dir="rtl" value={section.content_ar ?? ''} onChange={e => updateSection(key, { content_ar: e.target.value })} placeholder={labels.ar} className={inputCls} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

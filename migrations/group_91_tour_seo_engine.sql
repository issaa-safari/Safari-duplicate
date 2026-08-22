-- ============================================================
-- group_91_tour_seo_engine.sql
-- Additive foundation for template-aware bilingual tour SEO.
-- Existing tour facts remain in tours/tour_days; this migration does not
-- rewrite prices, dates, itineraries, distances, or other business data.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tour_templates (
  key text PRIMARY KEY,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  description_en text,
  description_ar text,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.tour_templates (key, name_en, name_ar, description_en, description_ar, sort_order, config_json)
VALUES
  ('legacy', 'Legacy / Unclassified', 'قديم / غير مصنف', 'Existing tour not yet assigned to a specialist SEO template.', 'رحلة حالية لم يتم تصنيفها بعد ضمن قالب SEO متخصص.', 0, '{"requiredSections":[],"optionalSections":[]}'::jsonb),
  ('classic_safari', 'Classic Safari', 'سفاري كلاسيكي', 'Wildlife and multi-park safari itineraries.', 'برامج سفاري للحياة البرية وزيارة عدة محميات.', 10, '{"requiredSections":["why_choose","wildlife","best_time","who_for"],"optionalSections":["game_drives","route_highlights","travel_times","safety"]}'::jsonb),
  ('luxury_safari', 'Luxury Safari', 'سفاري فاخر', 'Premium private safari experiences and accommodation-led itineraries.', 'برامج سفاري خاصة بإقامات وتجارب مميزة.', 20, '{"requiredSections":["why_choose","accommodation_experience","personalization","best_time"],"optionalSections":["dining","privacy","premium_services","wildlife"]}'::jsonb),
  ('family_safari', 'Family Safari', 'سفاري عائلي', 'Family-oriented safari itineraries with practical logistics.', 'برامج سفاري عائلية تراعي الأنشطة والوقت والتنقلات.', 30, '{"requiredSections":["family_suitability","travel_times","accommodation_experience","safety"],"optionalSections":["child_activities","meal_flexibility","rest_time","wildlife","best_time"]}'::jsonb),
  ('motorcycle_adventure', 'Motorcycle Adventure', 'مغامرة بالدراجات النارية', 'Guided motorcycle itineraries with route, terrain and support detail.', 'رحلات دراجات نارية مع تفاصيل المسار والتضاريس والدعم.', 40, '{"requiredSections":["riding_experience","route_highlights","terrain_detail","rider_requirements","support","best_time"],"optionalSections":["road_surfaces","gear","fuel","safety","accommodation_experience"]}'::jsonb),
  ('photography_safari', 'Photography Safari', 'سفاري تصوير', 'Safari itineraries designed around wildlife and landscape photography.', 'برامج سفاري تركز على تصوير الحياة البرية والمناظر الطبيعية.', 50, '{"requiredSections":["photography","wildlife","vehicle_experience","best_time"],"optionalSections":["lighting","equipment","landscapes","group_setup"]}'::jsonb),
  ('multi_country_safari', 'Kenya + Tanzania Safari', 'سفاري كينيا وتنزانيا', 'Multi-country East Africa safari itineraries.', 'برامج سفاري متعددة الدول في شرق أفريقيا.', 60, '{"requiredSections":["kenya_highlights","tanzania_highlights","border_logistics","best_time"],"optionalSections":["route_highlights","wildlife","travel_times","entry_requirements"]}'::jsonb),
  ('private_custom', 'Private / Custom Safari', 'سفاري خاص / مخصص', 'Tailor-made safari programs built around the traveller.', 'برامج سفاري خاصة يتم تصميمها حسب احتياج المسافر.', 70, '{"requiredSections":["customization","who_for","accommodation_experience"],"optionalSections":["possible_destinations","vehicle_experience","activities","best_time"]}'::jsonb),
  ('group_departure', 'Fixed Group Departure', 'رحلة جماعية بتاريخ محدد', 'Fixed-date group product using the existing departures system.', 'رحلة جماعية بمواعيد محددة تعتمد على نظام المغادرات الحالي.', 80, '{"requiredSections":["group_experience","who_for"],"optionalSections":["route_highlights","accommodation_experience","booking_conditions"]}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ar = EXCLUDED.name_ar,
  description_en = EXCLUDED.description_en,
  description_ar = EXCLUDED.description_ar,
  sort_order = EXCLUDED.sort_order,
  config_json = EXCLUDED.config_json,
  updated_at = now();

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS template_key text NOT NULL DEFAULT 'legacy';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tours_template_key_fkey'
      AND conrelid = 'public.tours'::regclass
  ) THEN
    ALTER TABLE public.tours
      ADD CONSTRAINT tours_template_key_fkey
      FOREIGN KEY (template_key) REFERENCES public.tour_templates(key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tours_template_key ON public.tours(template_key);

CREATE TABLE IF NOT EXISTS public.tour_seo (
  tour_id uuid PRIMARY KEY REFERENCES public.tours(id) ON DELETE CASCADE,
  seo_title_en text,
  seo_title_ar text,
  meta_description_en text,
  meta_description_ar text,
  primary_topic_en text,
  primary_topic_ar text,
  secondary_topics_en text[] NOT NULL DEFAULT '{}'::text[],
  secondary_topics_ar text[] NOT NULL DEFAULT '{}'::text[],
  search_intent text,
  seo_intro_en text,
  seo_intro_ar text,
  hero_alt_en text,
  hero_alt_ar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tour_seo_search_intent_check CHECK (
    search_intent IS NULL OR search_intent IN ('informational','commercial_research','transactional','destination','itinerary','family','luxury','adventure')
  )
);

CREATE TABLE IF NOT EXISTS public.tour_content_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  title_en text,
  title_ar text,
  content_en text,
  content_ar text,
  sort_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tour_content_sections_unique_key UNIQUE (tour_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_tour_content_sections_tour_order
  ON public.tour_content_sections(tour_id, sort_order);

-- Hidden tours are not public records. Align database-level public reads with
-- the website's 404 semantics, rather than relying only on application filters.
DROP POLICY IF EXISTS "Public read active tours" ON public.tours;
CREATE POLICY "Public read active public tours" ON public.tours
  FOR SELECT USING (status = 'active' AND show_on_website = true);

ALTER TABLE public.tour_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_seo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tour_content_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active tour templates" ON public.tour_templates;
CREATE POLICY "Public read active tour templates" ON public.tour_templates
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read SEO for public tours" ON public.tour_seo;
CREATE POLICY "Public read SEO for public tours" ON public.tour_seo
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_seo.tour_id
        AND t.status = 'active'
        AND t.show_on_website = true
    )
  );

DROP POLICY IF EXISTS "Public read content for public tours" ON public.tour_content_sections;
CREATE POLICY "Public read content for public tours" ON public.tour_content_sections
  FOR SELECT USING (
    is_enabled = true
    AND EXISTS (
      SELECT 1 FROM public.tours t
      WHERE t.id = tour_content_sections.tour_id
        AND t.status = 'active'
        AND t.show_on_website = true
    )
  );

GRANT SELECT ON public.tour_templates TO anon, authenticated;
GRANT SELECT ON public.tour_seo TO anon, authenticated;
GRANT SELECT ON public.tour_content_sections TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.tour_templates FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.tour_seo FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.tour_content_sections FROM anon, authenticated;
GRANT ALL ON public.tour_templates TO service_role;
GRANT ALL ON public.tour_seo TO service_role;
GRANT ALL ON public.tour_content_sections TO service_role;

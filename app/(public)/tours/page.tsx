import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'

const G = '#7A9A4A'

export default async function ToursPage() {
  const admin = createAdminClient()

  const { data: tours } = await admin
    .from('tours')
    .select('id, title_en, title_ar, description_en, destination_id, country, min_days, max_days, is_active')
    .eq('is_active', true)
    .order('title_en')

  return (
    <>
      <PublicHeader />
      <main>
        {/* Page Header */}
        <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Safari Tours</h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Explore our curated collection of unforgettable East African safari experiences. Each tour is designed to showcase Africa's most incredible wildlife and landscapes.
            </p>
          </div>
        </section>

        {/* Tours Grid */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            {tours && tours.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {tours.map((tour: any) => (
                  <div
                    key={tour.id}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition"
                  >
                    {/* Tour Placeholder */}
                    <div
                      className="w-full h-48 flex items-center justify-center text-6xl text-white"
                      style={{ backgroundColor: G }}
                    >
                      🦁
                    </div>

                    {/* Tour Info */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{tour.title_en}</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        {tour.country}
                      </p>
                      {tour.min_days && (
                        <p className="text-sm text-gray-600 mb-4">
                          <span className="font-semibold">{tour.min_days}-{tour.max_days || tour.min_days} days</span>
                        </p>
                      )}
                      {tour.description_en && (
                        <p className="text-sm text-gray-600 mb-6 line-clamp-3">
                          {tour.description_en}
                        </p>
                      )}
                      <Link
                        href={`/quote-request?tour=${tour.id}`}
                        className="block text-center px-4 py-2 rounded-lg font-semibold text-white transition"
                        style={{ backgroundColor: G }}
                      >
                        Request Quote
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg">No tours available yet. Check back soon!</p>
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Can't Find the Perfect Tour?</h2>
            <p className="text-lg text-gray-600 mb-8">
              Let us know your preferences and we'll create a custom safari just for you.
            </p>
            <Link
              href="/quote-request"
              className="px-8 py-3 rounded-lg font-semibold text-white transition inline-block"
              style={{ backgroundColor: G }}
            >
              Create a Custom Tour
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

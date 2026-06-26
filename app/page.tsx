import Link from 'next/link'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'

const G = '#7A9A4A'

export default function HomePage() {
  return (
    <>
      <PublicHeader />
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-gray-900 to-gray-800 text-white py-20 md:py-32">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Experience Africa&apos;s Greatest Safaris
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Discover the untamed beauty of East Africa with expert guides, luxury accommodations, and unforgettable wildlife encounters.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/tours"
                className="px-8 py-3 rounded-lg font-semibold transition inline-block text-center"
                style={{ backgroundColor: G, color: 'white' }}
              >
                Browse Tours
              </Link>
              <Link
                href="/quote-request"
                className="px-8 py-3 rounded-lg font-semibold border-2 border-white text-white hover:bg-white hover:text-gray-900 transition inline-block text-center"
              >
                Plan Your Trip
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Stats */}
        <section className="bg-white py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold" style={{ color: G }}>
                  500+
                </div>
                <p className="text-gray-600 mt-2">Happy Travelers</p>
              </div>
              <div>
                <div className="text-4xl font-bold" style={{ color: G }}>
                  20+
                </div>
                <p className="text-gray-600 mt-2">Unique Tours</p>
              </div>
              <div>
                <div className="text-4xl font-bold" style={{ color: G }}>
                  15+
                </div>
                <p className="text-gray-600 mt-2">Years Experience</p>
              </div>
              <div>
                <div className="text-4xl font-bold" style={{ color: G }}>
                  99%
                </div>
                <p className="text-gray-600 mt-2">Satisfaction Rate</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-16 md:py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
              Why Choose Safari Adventure Riders?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-8 border border-gray-200">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Expert Guides</h3>
                <p className="text-gray-600">
                  Our naturalist guides have decades of combined experience identifying wildlife and sharing stories of the African bush.
                </p>
              </div>
              <div className="bg-white rounded-xl p-8 border border-gray-200">
                <div className="text-4xl mb-4">⭐</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Luxury Stays</h3>
                <p className="text-gray-600">
                  Hand-picked accommodations ranging from intimate lodges to world-class resorts, all carefully curated for comfort.
                </p>
              </div>
              <div className="bg-white rounded-xl p-8 border border-gray-200">
                <div className="text-4xl mb-4">🛡️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Peace of Mind</h3>
                <p className="text-gray-600">
                  Safety is our priority. All tours include travel insurance, professional guides, and 24/7 support.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20" style={{ backgroundColor: G }}>
          <div className="max-w-4xl mx-auto px-4 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready for Your African Adventure?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Get a personalized quote for your dream safari. Our experts will tailor every detail to your preferences.
            </p>
            <Link
              href="/quote-request"
              className="px-8 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition inline-block"
            >
              Request Your Custom Quote
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

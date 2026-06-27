import Link from 'next/link'
import { Suspense } from 'react'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'

const G = '#7A9A4A'

export default function AboutPage() {
  return (
    <>
      <Suspense>
        <PublicHeader />
      </Suspense>
      <main>
        {/* Page Header */}
        <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">About Safari Adventure Riders</h1>
            <p className="text-lg text-gray-300">
              Discover our story and mission to create unforgettable African experiences.
            </p>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Founded in 2009, Safari Adventure Riders was born from a passion for Africa's incredible wildlife and landscapes. What started as a small operation with just a handful of expert naturalists has grown into one of East Africa's most trusted safari operators.
                </p>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Over the past 15 years, we've had the privilege of sharing the African bush with over 500 travelers from around the world. Each safari is more than just a vacation—it's a transformative experience that connects you with nature and cultures in ways you'll never forget.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Our commitment to responsible tourism, conservation, and exceptional service sets us apart. We believe that the best safaris are those where every detail is thoughtfully planned and executed.
                </p>
              </div>
              <div
                className="rounded-xl h-96 flex items-center justify-center text-8xl"
                style={{ backgroundColor: G }}
              >
                🦁
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Values */}
        <section className="py-16 md:py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Our Mission & Values</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl p-8 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Our Mission</h3>
                <p className="text-gray-600">
                  To create authentic, transformative African experiences through expert-led safaris that prioritize wildlife conservation, cultural respect, and traveler satisfaction.
                </p>
              </div>
              <div className="bg-white rounded-xl p-8 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Our Values</h3>
                <ul className="text-gray-600 space-y-2">
                  <li>✓ Excellence in every detail</li>
                  <li>✓ Conservation and sustainability</li>
                  <li>✓ Cultural respect and integrity</li>
                  <li>✓ Safety and reliability</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Why Us */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Why Travelers Choose Us</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">🌍</div>
                <h3 className="font-bold text-gray-900 mb-3">Expert Local Knowledge</h3>
                <p className="text-gray-600 text-sm">
                  Our naturalist guides are born and raised in East Africa with unparalleled expertise in wildlife behavior and ecosystems.
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🏕️</div>
                <h3 className="font-bold text-gray-900 mb-3">Curated Experiences</h3>
                <p className="text-gray-600 text-sm">
                  Every safari is customized to your interests, pace, and preferences—no cookie-cutter tours here.
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">💚</div>
                <h3 className="font-bold text-gray-900 mb-3">Conservation Focus</h3>
                <p className="text-gray-600 text-sm">
                  A percentage of every tour supports local conservation projects and community initiatives.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20" style={{ backgroundColor: G }}>
          <div className="max-w-4xl mx-auto px-4 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Join Our Adventure?</h2>
            <p className="text-lg mb-8 opacity-90">
              Let us help you plan the safari of a lifetime. Our team is ready to create a personalized experience just for you.
            </p>
            <Link
              href="/quote-request"
              className="px-8 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition inline-block"
            >
              Plan Your Safari
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

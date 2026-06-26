'use client'

import Link from 'next/link'

const G = '#7A9A4A'

export default function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: G }}
              >
                🦁
              </div>
              <span className="font-bold text-white">Safari Adventure Riders</span>
            </div>
            <p className="text-sm text-gray-400">
              Experience the wild. Expert-led safaris across East Africa's most iconic destinations.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Explore</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/tours" className="hover:text-white transition">
                  Browse Tours
                </Link>
              </li>
              <li>
                <Link href="/quote-request" className="hover:text-white transition">
                  Get a Quote
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition">
                  Our Story
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/contact" className="hover:text-white transition">
                  Contact Us
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4">Get in Touch</h3>
            <div className="space-y-2 text-sm">
              <p>
                Email:{' '}
                <a href="mailto:info@safariadventure.com" className="hover:text-white transition">
                  info@safariadventure.com
                </a>
              </p>
              <p>
                Phone:{' '}
                <a href="tel:+254123456789" className="hover:text-white transition">
                  +254 123 456 789
                </a>
              </p>
              <p>
                WhatsApp:{' '}
                <a href="https://wa.me/254123456789" className="hover:text-white transition" target="_blank" rel="noopener noreferrer">
                  +254 123 456 789
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2024 Safari Adventure Riders. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

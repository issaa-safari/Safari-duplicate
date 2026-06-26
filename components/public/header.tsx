'use client'

import Link from 'next/link'
import { useState } from 'react'

const G = '#7A9A4A'

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: G }}
          >
            🦁
          </div>
          <span className="font-bold text-gray-900 text-lg">Safari Adventure Riders</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/tours" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            Tours
          </Link>
          <Link href="/about" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            About
          </Link>
          <Link href="/contact" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
            Contact
          </Link>
          <Link
            href="/quote-request"
            className="px-5 py-2 rounded-lg font-medium text-white transition"
            style={{ backgroundColor: G }}
          >
            Request Quote
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 px-4 py-4 space-y-3">
          <Link href="/tours" className="block text-gray-600 hover:text-gray-900 text-sm font-medium py-2">
            Tours
          </Link>
          <Link href="/about" className="block text-gray-600 hover:text-gray-900 text-sm font-medium py-2">
            About
          </Link>
          <Link href="/contact" className="block text-gray-600 hover:text-gray-900 text-sm font-medium py-2">
            Contact
          </Link>
          <Link
            href="/quote-request"
            className="block px-5 py-2 rounded-lg font-medium text-white text-center transition"
            style={{ backgroundColor: G }}
          >
            Request Quote
          </Link>
        </div>
      )}
    </header>
  )
}

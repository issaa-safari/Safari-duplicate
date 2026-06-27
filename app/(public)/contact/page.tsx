'use client'

import { useState, useTransition, Suspense } from 'react'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'

const G = '#7A9A4A'

interface ContactFormData {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

async function submitContactForm(formData: ContactFormData) {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  })
  if (!response.ok) throw new Error('Failed to send message')
  return response.json()
}

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        await submitContactForm(formData)
        setSubmitted(true)
      } catch (err: any) {
        setError(err.message || 'Failed to send message. Please try again.')
      }
    })
  }

  return (
    <>
      <Suspense>
        <PublicHeader />
      </Suspense>
      <main>
        {/* Page Header */}
        <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Get in Touch</h1>
            <p className="text-lg text-gray-300">
              Have questions? We'd love to hear from you. Reach out to our team anytime.
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Contact Info */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Contact Information</h2>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
                    <a
                      href="mailto:info@safariadventure.com"
                      className="text-lg hover:underline"
                      style={{ color: G }}
                    >
                      info@safariadventure.com
                    </a>
                    <p className="text-gray-600 text-sm mt-1">We respond within 24 hours</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone</h3>
                    <a
                      href="tel:+254123456789"
                      className="text-lg hover:underline"
                      style={{ color: G }}
                    >
                      +254 (123) 456-789
                    </a>
                    <p className="text-gray-600 text-sm mt-1">Monday–Friday, 8am–6pm EAT</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp</h3>
                    <a
                      href="https://wa.me/254123456789"
                      className="text-lg hover:underline"
                      style={{ color: G }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      +254 (123) 456-789
                    </a>
                    <p className="text-gray-600 text-sm mt-1">Quick messages & quotes</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Office Location</h3>
                    <p className="text-gray-600">
                      Nairobi, Kenya
                      <br />
                      East Africa
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div>
                {submitted ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <div className="text-5xl mb-4">✓</div>
                    <h3 className="text-2xl font-bold text-green-900 mb-3">Message Sent!</h3>
                    <p className="text-green-700">
                      Thank you for contacting us. We'll get back to you as soon as possible.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-8 border border-gray-200">
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Subject *</label>
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Message *</label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>

                    {error && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full px-6 py-3 rounded-lg font-semibold text-white transition disabled:opacity-50"
                      style={{ backgroundColor: G }}
                    >
                      {isPending ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}

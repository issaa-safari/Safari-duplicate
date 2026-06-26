import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Safari Adventure Tour',
}

export default function PrivacyPolicyPage() {
  const updated = 'June 26, 2026'

  return (
    <main className="min-h-screen bg-white px-6 py-16 text-gray-800">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {updated}</p>

        <section className="mt-10 space-y-4">
          <p>
            Safari Adventure Tour (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates a tour
            enquiry and booking service. This Privacy Policy explains how we collect, use, and
            protect personal information you share with us — including via WhatsApp.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
            <li>
              <strong>Contact details</strong> — name, phone number, WhatsApp number, email address,
              and country of residence, provided when you enquire about a tour.
            </li>
            <li>
              <strong>Message content</strong> — the text of messages you send us via WhatsApp or
              other channels, used to understand your travel requirements.
            </li>
            <li>
              <strong>Travel preferences</strong> — travel dates, group size, destination interests,
              and any other details you share during the enquiry or booking process.
            </li>
            <li>
              <strong>Quote interactions</strong> — whether you viewed, accepted, or declined a
              quote we sent you, along with the approximate date and time.
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
            <li>To respond to your enquiry and prepare a personalised tour quote.</li>
            <li>To manage your booking and coordinate logistics.</li>
            <li>To contact you with updates relevant to your enquiry or booking.</li>
            <li>To improve our services and internal processes.</li>
          </ul>
          <p className="mt-4 text-gray-700">
            We do not sell, rent, or share your personal information with third parties for
            marketing purposes.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-gray-900">3. WhatsApp Messaging</h2>
          <p className="mt-4 text-gray-700">
            When you message us on WhatsApp, we receive your phone number and display name as
            provided by the WhatsApp platform (Meta). This data is used solely to create and
            manage your tour enquiry. Our use of the WhatsApp Business API is subject to{' '}
            <a
              href="https://www.whatsapp.com/legal/business-policy"
              className="underline text-gray-900 hover:text-gray-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Meta&apos;s Business Policy
            </a>
            .
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-gray-900">4. Data Storage & Security</h2>
          <p className="mt-4 text-gray-700">
            Your data is stored securely using Supabase (PostgreSQL) with access restricted to
            authorised team members only. We use industry-standard encryption in transit (HTTPS/TLS)
            and at rest.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-gray-900">5. Data Retention</h2>
          <p className="mt-4 text-gray-700">
            We retain your personal information for as long as necessary to fulfil the purposes
            described in this policy, or as required by law. You may request deletion of your data
            at any time by contacting us.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-gray-900">6. Your Rights</h2>
          <p className="mt-4 text-gray-700">
            You have the right to access, correct, or delete the personal information we hold about
            you. To exercise any of these rights, please contact us using the details below.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-gray-900">7. Contact Us</h2>
          <p className="mt-4 text-gray-700">
            If you have questions about this Privacy Policy or how your data is handled, please
            contact us at:
          </p>
          <address className="mt-3 not-italic text-gray-700">
            <strong>Safari Adventure Tour</strong>
            <br />
            Email:{' '}
            <a href="mailto:issa.alamoudy1st@gmail.com" className="underline hover:text-gray-600">
              issa.alamoudy1st@gmail.com
            </a>
          </address>
        </section>

        <p className="mt-16 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Safari Adventure Tour. All rights reserved.
        </p>
      </div>
    </main>
  )
}

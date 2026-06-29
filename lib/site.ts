// Central business / brand configuration.
// Single source of truth for contact details so they never drift between
// the footer, contact page, WhatsApp button and metadata.

export const site = {
  name: 'Safari Adventure Riders',
  domain: 'safariadventureriders.com',
  url: 'https://safariadventureriders.com',
  email: 'info@safariadventureriders.com',
  // Display + dial/normalised forms of the same number.
  phoneDisplay: '+254 710 789 789',
  phoneE164: '+254710789789',
  whatsappNumber: '254710789789', // wa.me expects digits only, no +
  address: {
    en: 'Nairobi, Kenya\nEast Africa',
    ar: 'نيروبي، كينيا\nشرق أفريقيا',
  },
  hours: {
    en: 'Monday–Friday, 8am–6pm EAT',
    ar: 'الاثنين–الجمعة، 8 صباحاً–6 مساءً بتوقيت شرق أفريقيا',
  },
} as const

export const whatsappLink = (text?: string) =>
  `https://wa.me/${site.whatsappNumber}${text ? `?text=${encodeURIComponent(text)}` : ''}`

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import PublicHeader from '@/components/public/header'
import PublicFooter from '@/components/public/footer'
import WhatsAppButton from '@/components/public/whatsapp-button'
import StructuredData from '@/components/public/structured-data'
import { getServerLocale } from '@/lib/i18n'
import { localePath } from '@/lib/locale'
import { pageMetadata, faqPageJsonLd } from '@/lib/seo'

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const locale = await getServerLocale(await searchParams)
  return pageMetadata({ path: '/kenya-safari', locale, absoluteTitle: true,
    title: { en: 'Kenya Safari Tours & Private Packages | Safari Adventure Riders', ar: 'سفاري كينيا | رحلات وبرامج خاصة مع مشغل محلي' },
    description: { en: 'Plan a Kenya safari directly with a Nairobi-based local operator. Private, family, luxury, photography and adventure safaris to Maasai Mara, Amboseli and beyond.', ar: 'خطط لرحلة سفاري كينيا مع مشغل محلي في نيروبي. برامج خاصة وعائلية وفاخرة ورحلات تصوير إلى ماساي مارا وأمبوسيلي وأشهر وجهات كينيا.' } })
}

export default async function KenyaSafariPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = await getServerLocale(await searchParams); const isAr = locale === 'ar'
  const t = isAr ? {
    eyebrow:'مشغل سفاري محلي في كينيا', title:'سفاري كينيا — خطط رحلتك مع فريق محلي', intro:'من مقرنا في نيروبي، ننظم رحلات سفاري خاصة ومخصصة للعوائل والأزواج والمصورين ومحبي المغامرة. نبني البرنامج حسب مدة رحلتك وميزانيتك وأسلوب السفر الذي تفضله.',
    why:'لماذا تحجز سفاري كينيا معنا؟', whyBody:'تتعامل مباشرة مع فريق موجود في كينيا، مع دعم باللغة العربية وخيارات مرنة للبرنامج والإقامة والأنشطة.', places:'أشهر وجهات السفاري في كينيا', placeBody:'يمكن أن تشمل رحلتك ماساي مارا، أمبوسيلي، سامبورو، بحيرة ناكورو، نيفاشا، جبل كينيا ومناطق أخرى حسب الموسم والمدة.', styles:'رحلة تناسب أسلوبك', styleBody:'نرتب سفاري عائلي، رحلات خاصة، تجارب فاخرة، رحلات تصوير، مغامرات ودراجات نارية، بالإضافة إلى برامج تجمع كينيا وتنزانيا.', cta:'شاهد رحلاتنا', quote:'اطلب برنامجاً مخصصاً', faq:'أسئلة شائعة'
  } : {
    eyebrow:'Local Kenya safari operator', title:'Kenya Safari Tours — Planned Locally, Built Around You', intro:'Based in Nairobi, we organise private and tailored Kenya safaris for families, couples, photographers and adventure travellers. We build the itinerary around your trip length, budget and preferred travel style.',
    why:'Why book your Kenya safari with us?', whyBody:'You deal directly with a team based in Kenya, with Arabic support and flexible choices for itinerary, accommodation and activities.', places:'Top Kenya safari destinations', placeBody:'Your safari can include Maasai Mara, Amboseli, Samburu, Lake Nakuru, Naivasha, Mount Kenya and other regions depending on the season and trip length.', styles:'A safari built for your travel style', styleBody:'We arrange family safaris, private trips, luxury experiences, photography safaris, adventure and motorcycle tours, plus Kenya and Tanzania combinations.', cta:'Explore Our Tours', quote:'Request a Custom Safari', faq:'Frequently Asked Questions'
  }
  const faqs = isAr ? [
    {question:'ما أفضل وقت لسفاري كينيا؟',answer:'كينيا مناسبة للسفاري طوال العام، ويعتمد أفضل وقت على المناطق والحياة البرية والطقس والتجربة التي تبحث عنها.'},
    {question:'هل يمكن ترتيب سفاري كينيا للعوائل؟',answer:'نعم. يمكن تصميم البرنامج للعوائل مع اختيار الإقامة والأنشطة والمسافات اليومية بما يناسب أفراد المجموعة.'},
    {question:'هل يتوفر دعم باللغة العربية؟',answer:'نعم، يمكن لعملائنا العرب التواصل معنا بالعربية أثناء التخطيط للرحلة والاستفسار.'}
  ] : [
    {question:'What is the best time for a Kenya safari?',answer:'Kenya offers safari experiences year-round. The best timing depends on the regions, wildlife, weather and experience you want.'},
    {question:'Can you arrange family safaris in Kenya?',answer:'Yes. We can tailor accommodation, activities and daily driving distances to suit families and different group needs.'},
    {question:'Do you support Arabic-speaking travellers?',answer:'Yes. Arabic-speaking clients can communicate with us in Arabic while planning and enquiring about their Kenya trip.'}
  ]
  return <div dir={isAr?'rtl':'ltr'}><StructuredData data={faqPageJsonLd(faqs)}/><Suspense><PublicHeader initialLang={locale}/></Suspense><main>
    <section style={{background:'#20271A',color:'#fff',padding:'96px 24px 80px'}}><div style={{maxWidth:900,margin:'0 auto'}}><p style={{color:'#C9A24B',fontWeight:700}}>{t.eyebrow}</p><h1 style={{fontSize:'clamp(2.2rem,6vw,4rem)',lineHeight:1.08,margin:'12px 0 24px',fontFamily:'var(--font-display,sans-serif)'}}>{t.title}</h1><p style={{maxWidth:760,fontSize:'1.15rem',lineHeight:1.8,color:'#EAE3D2'}}>{t.intro}</p><div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:32}}><Link href={localePath('/tours',locale)} style={{background:'#7A9A4A',color:'#fff',padding:'14px 22px',borderRadius:8,textDecoration:'none',fontWeight:700}}>{t.cta}</Link><Link href={localePath('/quote-request',locale)} style={{border:'1px solid #EAE3D2',color:'#fff',padding:'14px 22px',borderRadius:8,textDecoration:'none',fontWeight:700}}>{t.quote}</Link></div></div></section>
    {[[t.why,t.whyBody],[t.places,t.placeBody],[t.styles,t.styleBody]].map(([h,b],i)=><section key={h} style={{padding:'64px 24px',background:i%2?'#EAE3D2':'#fff'}}><div style={{maxWidth:900,margin:'0 auto'}}><h2 style={{color:'#20271A',fontSize:'clamp(1.6rem,4vw,2.3rem)',fontFamily:'var(--font-display,sans-serif)'}}>{h}</h2><p style={{color:'#3D3D35',fontSize:'1.05rem',lineHeight:1.8,maxWidth:760}}>{b}</p></div></section>)}
    <section style={{padding:'64px 24px',background:'#fff'}}><div style={{maxWidth:900,margin:'0 auto'}}><h2>{t.faq}</h2>{faqs.map(f=><details key={f.question} style={{borderBottom:'1px solid #DDD8CC',padding:'18px 0'}}><summary style={{fontWeight:700,cursor:'pointer'}}>{f.question}</summary><p style={{lineHeight:1.7}}>{f.answer}</p></details>)}</div></section>
  </main><PublicFooter/><WhatsAppButton lang={locale}/></div>
}

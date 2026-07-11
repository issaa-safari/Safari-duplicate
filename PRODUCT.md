# Product

## Register

brand

## Platform

web

> This project is a true 50/50 split across two surfaces. The public **Safari Adventure Riders** site (`app/(public)/`, `app/page.tsx`, `app/quote/[token]/`) takes the **brand** register — design IS the product there. The admin operator platform (`app/admin/`) takes the **product** register — design serves the pipeline workflow. Pick the register from the surface in focus; the bare value above is only the fallback for genuinely ambiguous tasks.

## Users

The primary audience for the public site is Arabic-speaking travelers from the Gulf and wider region planning East African trips — the site ships full RTL with Arabic typography as a first-class rendering, not a translation pass. International English-speaking travelers are the secondary audience; every page must work equally well in both languages and directions. The admin platform's users are the operator's own team: tour consultants working the request → quote → booking pipeline all day, often under time pressure while a lead is hot.

## Product Purpose

One system, two jobs. The public site turns safari and motorbike-trail interest into qualified enquiries — primarily WhatsApp conversations, secondarily structured quote requests. The admin platform (requests pipeline, day-by-day quote builder, bookings, clients, suppliers, finance, analytics) turns those enquiries into confirmed bookings as fast as possible. Success is both funnels working together: leads in, bookings out.

## Positioning

The motorbike + safari specialists — the rare East African operator running motorcycle trail adventures alongside classic private safaris.

## Conversion & proof

- Primary CTA: start a WhatsApp conversation (persistent floating button, `components/public/whatsapp-button.tsx`). Secondary: the quote-request wizard for travelers who want a structured plan first.
- The line a visitor remembers after 10 seconds: "The East African operator that rides the trails it sells."
- Belief ladder: (1) these people actually ride and run these trails themselves → (2) they're local and handle everything direct, no middleman markup → (3) I can just message them on WhatsApp and it's real.
- Proof on hand: traveler testimonials (`components/public/testimonials.tsx`), tour gallery imagery (`app/(public)/gallery/`).

## Brand Personality

Bold, thrilling, premium. High-adrenaline adventure with a premium finish — the trip of a lifetime, presented with the confidence of people who ride these trails themselves. The thrill is earned and specific (dust, distance, wildlife at eye level), never generic adrenaline marketing.

## Anti-references

The luxury-lodge cliché: muted gold serif elegance, full-bleed sunset hero with thin white text, hushed "$2k/night retreat" tone. Every safari operator's template — premium here means bold and alive, not hushed and beige.

## Design Principles

1. **Two registers, one brand.** The public site thrills; the admin serves. Both draw from the same Kenyan-landscape identity, but never let admin utility flatten the brand or brand drama slow the pipeline.
2. **Bilingual-first.** Arabic/RTL is a primary rendering. Layout, type, and motion decisions are made for both directions at once, never retrofitted.
3. **Thrill with proof.** Bold claims ride with evidence — real testimonials, real routes, real photos. Premium confidence, never lodge-cliché softness.
4. **Always within reach of a conversation.** Every public page keeps the WhatsApp conversation one gesture away; the design closes toward a human chat, not a checkout.
5. **Pipeline speed is a design feature.** Admin screens optimize time from request to sent quote — fewer clicks, scannable status, no decoration that costs a consultant seconds.

## Accessibility & Inclusion

WCAG 2.1 AA (per PRD §6, which specifically flags green-on-white contrast fixes and ARIA combobox/focus-trap work in the admin). Full EN/AR parity: RTL mirroring, Arabic line-height/letterform respect, `dir`-aware components. Reduced-motion alternatives for all animation.

// Render one carousel slide to a standalone HTML document.
// Pure function of (slide, ctx) — no filesystem, no network. export.mjs resolves
// absolute file:// URLs for fonts/logo/photo and hands them in via ctx.

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Fixed brand strings shared by every carousel.
const BRAND = { lat: 'Safari Adventure', ar: 'سفاري أدفنشر' }
const CTA_DEFAULTS = {
  wordmarkEn: 'Safari Adventure',
  wordmarkAr: 'سفاري أدفنشر',
  bandA: 'للحجز أو الاستفسار',
  bandB: 'تواصل معنا واتساب 💬',
  footnote: 'الرابط في البايو · نعمل في كينيا من ٢٠١٢ 🇰🇪',
}

const pill = () =>
  `<div class="pill"><span class="lat">${esc(BRAND.lat)}</span>` +
  `<span class="dot">·</span><span class="ar">${esc(BRAND.ar)}</span></div>`

const counter = (index, total) =>
  `<div class="counter"><b>${index}</b>/${total}</div>`

// Full-bleed photo, or the savanna placeholder + dashed spec note when the
// photo path is missing — lets drafts render before photos exist (§6).
function photoLayer(slide, ctx) {
  if (ctx.photoHref) {
    const focus = slide.focus ? ` background-position:${esc(slide.focus)};` : ''
    return `<div class="photo" style="background-image:url('${ctx.photoHref}');${focus}"></div>`
  }
  const spec = slide.photo
    ? `<div class="spec-note"><b>PHOTO NEEDED</b>${esc(slide.photo)}${
        slide.focus ? `<br>focus ${esc(slide.focus)}` : ''
      }</div>`
    : `<div class="spec-note"><b>PHOTO NEEDED</b>drop a frame in this slide's <code>photo</code> field</div>`
  return `<div class="photo placeholder"></div>${spec}`
}

function coverBody(slide, ctx) {
  return `
    ${photoLayer(slide, ctx)}
    ${ctx.logoHref ? `<img class="logo-tl" src="${ctx.logoHref}" alt="">` : ''}
    ${counter(ctx.index, ctx.total)}
    <div class="bands">
      <div class="band-a"><h1>${esc(slide.bandA)}</h1></div>
      ${slide.bandB ? `<div class="band-b"><p>${esc(slide.bandB)}</p></div>` : ''}
    </div>
    ${pill()}`
}

function contentBody(slide, ctx) {
  return `
    ${photoLayer(slide, ctx)}
    <div class="scrim"></div>
    ${counter(ctx.index, ctx.total)}
    <div class="content-stack">
      <div class="title-band">
        ${slide.eyebrow ? `<span class="eyebrow">${esc(slide.eyebrow)}</span>` : '<span></span>'}
        <h2>${esc(slide.title)}</h2>
      </div>
      ${slide.body ? `<div class="content-body"><p>${esc(slide.body)}</p></div>` : ''}
    </div>
    ${pill()}`
}

function ctaBody(slide, ctx) {
  const c = { ...CTA_DEFAULTS, ...slide }
  return `
    ${counter(ctx.index, ctx.total)}
    <div class="cta">
      ${ctx.logoHref ? `<img class="mark" src="${ctx.logoHref}" alt="">` : ''}
      <div class="wordmark">${esc(c.wordmarkEn)}<span class="ar">${esc(c.wordmarkAr)}</span></div>
      <div class="cta-band sage">${esc(c.bandA)}</div>
      <div class="cta-band amber">${esc(c.bandB)}</div>
      <div class="footnote">${esc(c.footnote)}</div>
    </div>
    ${pill()}`
}

const LAYOUTS = { cover: coverBody, content: contentBody, cta: ctaBody }

/**
 * @param {object} slide  one entry from carousel.slides
 * @param {object} ctx    { index, total, templateHref, logoHref, photoHref }
 * @returns {string} standalone HTML document for a 1080×1350 render
 */
export function renderSlide(slide, ctx) {
  const build = LAYOUTS[slide.layout]
  if (!build) throw new Error(`unknown layout: ${slide.layout}`)
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<base href="${ctx.templateHref}">
<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<div class="slide">${build(slide, ctx)}</div>
</body>
</html>`
}

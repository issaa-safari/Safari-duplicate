// Curated, long-stable Unsplash safari photography used as a tasteful fallback
// when a tour/departure has no hero image uploaded yet. Real DB images
// (hero_image_url / gallery_urls) always take precedence; see SafariImage.

export const STOCK_SAFARI_IMAGES = [
  'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80', // zebra herd
  'https://images.unsplash.com/photo-1547970810-dc1eac37d174?auto=format&fit=crop&w=1200&q=80', // elephant
  'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=1200&q=80', // lion
  'https://images.unsplash.com/photo-1535941339077-2dd1c7963098?auto=format&fit=crop&w=1200&q=80', // giraffe
  'https://images.unsplash.com/photo-1504173010664-32509aeebb62?auto=format&fit=crop&w=1200&q=80', // elephant herd
  'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=1200&q=80', // safari vehicle
] as const

// Wide cinematic image for page heroes.
export const STOCK_HERO_IMAGE =
  'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=2000&q=80'

// Deterministic pick so the same card always shows the same image.
export function stockImageFor(seed: string | number): string {
  const s = String(seed)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return STOCK_SAFARI_IMAGES[h % STOCK_SAFARI_IMAGES.length]
}

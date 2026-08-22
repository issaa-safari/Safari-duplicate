import type { AccommodationTier } from './types'

export const ACCOMMODATION_TIER_LABELS_EN: Record<AccommodationTier, string> = {
  budget: 'Budget', midrange: 'Mid-Range', luxury: 'Luxury', ultra: 'Ultra-Luxury',
}

export const ACCOMMODATION_TIER_LABELS_AR: Record<AccommodationTier, string> = {
  budget: 'اقتصادي', midrange: 'متوسط', luxury: 'فاخر', ultra: 'فاخر جداً',
}

// Admin-theme (Tailwind) badge classes. The client-facing quote documents use
// inline styles instead — see their own tier-badge handling.
export const ACCOMMODATION_TIER_BADGE_CLASSES: Record<AccommodationTier, string> = {
  budget: 'bg-muted text-muted-foreground',
  midrange: 'bg-blue-100 text-blue-700',
  luxury: 'bg-amber-100 text-warning-foreground',
  ultra: 'bg-purple-100 text-purple-700',
}

export function accommodationTierLabel(tier: string | null | undefined, isArabic = false): string | null {
  if (!tier) return null
  const labels = isArabic ? ACCOMMODATION_TIER_LABELS_AR : ACCOMMODATION_TIER_LABELS_EN
  return labels[tier as AccommodationTier] ?? tier
}

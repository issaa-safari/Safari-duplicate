import { ReactNode } from 'react';

/**
 * @startingPoint section="Components" subtitle="White rounded card — base container" viewport="320x160"
 */
export interface CardProps {
  children: ReactNode;
  padding?: number;
  hoverable?: boolean;
  style?: React.CSSProperties;
}

/**
 * @startingPoint section="Components" subtitle="Full-bleed accent-tinted feature card (Choose Your Trail)" viewport="360x400"
 */
export interface FeatureCardProps {
  imageUrl: string;
  /** Hex accent tinting the gradient + CTA text — var(--accent-bike) or var(--accent-private). */
  accent: string;
  badge: string;
  heading: string;
  body: string;
  cta: string;
  href: string;
}

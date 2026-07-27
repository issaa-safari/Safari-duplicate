import { ReactNode } from 'react';

/**
 * @startingPoint section="Components" subtitle="Departure/booking status pill" viewport="200x50"
 */
export interface StatusBadgeProps {
  /** available/guaranteed = green, low = amber (seats ≤3), full = grey, cancelled = red. */
  status?: 'guaranteed' | 'available' | 'low' | 'full' | 'cancelled';
  children: ReactNode;
}

export interface TrailBadgeProps {
  children: ReactNode;
}

export interface EyebrowProps {
  children: ReactNode;
}

import { ReactNode } from 'react';

/**
 * @startingPoint section="Components" subtitle="Inline form/page feedback message" viewport="360x60"
 */
export interface AlertProps {
  variant?: 'error' | 'success' | 'warning' | 'info';
  children: ReactNode;
}

import { ReactNode } from 'react';

/**
 * @startingPoint section="Components" subtitle="Bush-dark toast — booking/save confirmation" viewport="380x80"
 */
export interface ToastProps {
  variant?: 'success' | 'error';
  children: ReactNode;
  onClose?: () => void;
}

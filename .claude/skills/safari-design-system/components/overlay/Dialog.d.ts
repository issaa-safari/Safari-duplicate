import { ReactNode } from 'react';

/**
 * @startingPoint section="Components" subtitle="Modal dialog — admin create/edit forms" viewport="440x300"
 */
export interface DialogProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}

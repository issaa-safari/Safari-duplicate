import { ReactNode, MouseEventHandler } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * @startingPoint section="Components" subtitle="Primary CTA button — olive fill, warm hover" viewport="360x120"
 */
export interface ButtonProps {
  /** Visual style. primary = olive fill (main CTAs like "Request a Quote"). secondary = white/bordered. ghost = outlined olive text. danger = text-only red (destructive/admin actions). */
  variant?: ButtonVariant;
  /** Button size — sm for inline/table actions, md default, lg for hero CTAs. */
  size?: ButtonSize;
  /** Shows a loading label and disables the button. */
  loading?: boolean;
  /** Text shown while loading (default "Saving…"). */
  loadingText?: string;
  disabled?: boolean;
  /** Optional icon element (e.g. a lucide-react icon). */
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit';
}

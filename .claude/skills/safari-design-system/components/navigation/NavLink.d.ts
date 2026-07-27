/**
 * @startingPoint section="Components" subtitle="EN / \u0627\u0644\u0639\u0631\u0628\u064a\u0629 header switch" viewport="180x50"
 */
export interface LanguageToggleProps {
  value?: 'en' | 'ar';
  onChange?: (lang: 'en' | 'ar') => void;
}

export interface NavLinkProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

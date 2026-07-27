/**
 * @startingPoint section="Components" subtitle="Olive radio — single choice (trail type, seats)" viewport="220x50"
 */
export interface RadioProps {
  checked: boolean;
  onChange?: () => void;
  label?: string;
  name?: string;
  disabled?: boolean;
}

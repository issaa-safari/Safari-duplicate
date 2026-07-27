/**
 * @startingPoint section="Components" subtitle="Olive switch — admin settings & preferences" viewport="220x60"
 */
export interface ToggleProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

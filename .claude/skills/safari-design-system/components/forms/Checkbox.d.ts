/**
 * @startingPoint section="Components" subtitle="Olive check — agreement / multi-select" viewport="220x50"
 */
export interface CheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

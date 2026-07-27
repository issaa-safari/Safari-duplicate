/**
 * @startingPoint section="Components" subtitle="Underline tabs — admin content sections" viewport="360x60"
 */
export interface TabsProps {
  tabs: string[];
  value: string;
  onChange?: (tab: string) => void;
}

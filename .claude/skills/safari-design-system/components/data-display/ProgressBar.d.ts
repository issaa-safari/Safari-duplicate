/**
 * @startingPoint section="Components" subtitle="Seats-booked bar — departure cards" viewport="240x30"
 */
export interface ProgressBarProps {
  /** 0–100. */
  percent: number;
  /** Overrides the auto olive/murram (≥80% = murram, urgency) color. */
  color?: string;
}

export interface LineTotals {
  totalCostUsd: number
  totalSellingUsd: number
}

// Shared cost/markup math for quote price lines. Used by both the
// per-line actions and bulk markup updates so the formula only lives once.
export function calculateLineTotals(quantity: number, unitCostUsd: number, markupPercent: number): LineTotals {
  const totalCostUsd = quantity * unitCostUsd
  const totalSellingUsd = totalCostUsd * (1 + markupPercent / 100)
  return { totalCostUsd, totalSellingUsd }
}
